import { HttpRequest, httpMethods } from "@tix-factory/http";
import EventEmitter from "events";
import queueError from "./queueError.js";
const schemeRegex = /^\w+:/;

const prependZero = (num) => {
	return (`0${num}`).slice(-2);
};

const millisecondsToTimeSpan = (ms) => {
	const days = Math.floor(ms / (1000 * 60 * 60 * 24));
	ms -=  days * (1000 * 60 * 60 * 24);

	const hours = Math.floor(ms / (1000 * 60 * 60));
	ms -= hours * (1000 * 60 * 60);

	const mins = Math.floor(ms / (1000 * 60));
	ms -= mins * (1000 * 60);

	const seconds = Math.floor(ms / (1000));
	ms -= seconds * (1000);
	ms = Math.floor(ms);

	let timeSpan = `${prependZero(hours)}:${prependZero(mins)}:${prependZero(seconds)}`;
	if (days > 0) {
		timeSpan = `${days}.${timeSpan}`;
	}

	if (ms > 0) {
		timeSpan += `.${ms}`;
	}

	return timeSpan;
};

export default class extends EventEmitter {
	constructor(httpClient, logger, options) {
		super();

		if (!options) {
			options = {};
		}

		this.httpClient = httpClient;
		this.logger = logger;
		this.options = options;
		
		if (!options.hasOwnProperty("countRefreshInterval")) {
			options.countRefreshInterval = 1000;
		}

		if (!options.queueName) {
			throw new Error("Invalid queueName");
		}

		let queueServiceHost = process.env.QueueServiceHost;
		if (!schemeRegex.test(queueServiceHost)) {
			queueServiceHost = `https://${queueServiceHost}`; 
		}

		this._endpoints = {
			getQueueSize: new URL(`${queueServiceHost}/v1/GetQueueSize`),
			getHeldQueueSize: new URL(`${queueServiceHost}/v1/GetHeldQueueSize`),
			addQueueItem: new URL(`${queueServiceHost}/v1/AddQueueItem`),
			leaseQueueItem: new URL(`${queueServiceHost}/v1/LeaseQueueItem`),
			removeQueueItem: new URL(`${queueServiceHost}/v1/RemoveQueueItem`),
			releaseQueueItem: new URL(`${queueServiceHost}/v1/ReleaseQueueItem`),
			clearQueue: new URL(`${queueServiceHost}/v1/ClearQueue`)
		};

		this._lastSize = 0;
		this._lastHeldSize = 0;
		this._loadQueueSizeDebounce = false;

		if (options.countRefreshInterval) {
			setInterval(this.loadQueueSize.bind(this), options.countRefreshInterval);
		}
	}

	getQueueSize() {
		return Promise.resolve(this._lastSize);
	}

	getHeldQueueSize() {
		return Promise.resolve(this._lastHeldSize);
	}

	push(item) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.sendPostRequest(this._endpoints.addQueueItem, {
					queueName: this.options.queueName,
					data: JSON.stringify({
						data: item
					})
				});

				this.triggerSizeChange(this._lastSize + 1);

				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	lease(expiryInMilliseconds) {
		return new Promise(async (resolve, reject) => {
			try {
				const leaseExpiry = millisecondsToTimeSpan(expiryInMilliseconds);
				const queueItem = await this.sendPostRequest(this._endpoints.leaseQueueItem, {
					queueName: this.options.queueName,
					leaseExpiry: leaseExpiry
				});

				if (queueItem.data) {
					this.triggerHeldSizeChange(this._lastHeldSize + 1);

					let data = await this.parseQueueItemData(queueItem.data);
					resolve({
						id: queueItem.data.id,
						leaseId: queueItem.data.leaseId,
						item: data
					});
				} else {
					resolve(null);
				}
			} catch (e) {
				reject(e);
			}
		});
	}

	remove(id, leaseId) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.sendPostRequest(this._endpoints.removeQueueItem, {
					id: id,
					leaseId: leaseId
				});

				this.triggerSizeChange(this._lastSize - 1);
				this.triggerHeldSizeChange(this._lastHeldSize - 1);

				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	release(id, leaseId) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.sendPostRequest(this._endpoints.releaseQueueItem, {
					id: id,
					leaseId: leaseId
				});

				this.triggerHeldSizeChange(this._lastHeldSize + 1);

				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	clear() {
		return new Promise(async (resolve, reject) => {
			try {
				await this.sendPostRequest(this._endpoints.clearQueue, {
					data: this.options.queueName
				});

				this.triggerSizeChange(0);
				this.triggerHeldSizeChange(0);

				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	loadQueueSize() {
		if (this._loadQueueSizeDebounce) {
			return;
		}

		this._loadQueueSizeDebounce = true;

		const queueSizePromise = new Promise(async (resolve, reject) => {
			try {
				const sizeResponse = await this.sendPostRequest(this._endpoints.getQueueSize, {
					"data": this.options.queueName
				});

				const heldSizeResponse = await this.sendPostRequest(this._endpoints.getHeldQueueSize, {
					"data": this.options.queueName
				});
				
				resolve({
					size: sizeResponse.data,
					heldSize: heldSizeResponse.data
				});
			} catch (e) {
				reject(e);
			}
		});

		queueSizePromise.then(sizes => {
			this.triggerSizeChange(sizes.size);
			this.triggerHeldSizeChange(sizes.heldSize);
		}).catch(e => {
			let message = "";
			if (e instanceof Error) {
				message = e.stack || e.toString();
			} else if (typeof(e) === "object" || Array.isArray(e)) {
				message = JSON.stringify(e);
			} else if (typeof(e) === "string") {
				message = e;
			} else {
				message = `${e}`;
			}
			
			if (this.logger) {
				this.logger.warn(`Unexpected exception thrown reading queue size.\n${message}`)
			}
		}).finally(() => {
			this._loadQueueSizeDebounce = false;
		});
	}

	sendPostRequest(url, requestBody) {
		return new Promise(async (resolve, reject) => {
			try {
				const httpRequest = new HttpRequest(httpMethods.post, url);
				httpRequest.addOrUpdateHeader("Content-Type", "application/json");
				httpRequest.addOrUpdateHeader("Tix-Factory-Api-Key", process.env.ApplicationApiKey);
				httpRequest.body = Buffer.from(JSON.stringify(requestBody));

				const httpResponse = await this.httpClient.send(httpRequest);
				if (httpResponse.statusCode === 200) {
					resolve(JSON.parse(httpResponse.body.toString()));
				} else if (httpResponse.statusCode === 204) {
					resolve();
				} else if (httpResponse.statusCode === 400) {
					const responseBody = JSON.parse(httpResponse.body.toString());
					resolve({
						code: responseBody.code
					});
				} else {
					reject({
						data: httpResponse.statusCode,
						code: "QueueServiceRequestFailed"
					});
				}
			} catch (e) {
				reject(e);
			}
		});
	}

	parseQueueItemData(queueItem) {
		return new Promise((resolve, reject) => {
			let message = "";
			try {
				const data = JSON.parse(queueItem.data);
				if (data.data) {
					resolve(data.data);
					return;
				}
			} catch (e) {
				message = this.serializeError(e);
			}

			if (this.logger) {
				this.logger.warn(`Failed to parse queue item. Removing from queue...\n\tID: ${queueItem.id}\n\tData: ${queueItem.data}\n\n${message}`);
			}

			this.remove(queueItem.id, queueItem.leaseId).then(() => {
				// Successfully removed bad item from queue
			}).catch(e => {
				if (this.logger) {
					message = this.serializeError(e);
					this.logger.warn(`Failed to remove queue item.\n\tID: ${queueItem.id}\n\n${message}`);
				}
			}).finally(() => {
				reject(queueError.invalidQueueItemData);
			});
		});
	}

	serializeError(e) {
		let message = "";
		if (e instanceof Error) {
			message = e.stack || e.toString();
		} else if (typeof(e) === "object" || Array.isArray(e)) {
			message = JSON.stringify(e);
		} else if (typeof(e) === "string") {
			message = e;
		} else {
			message = `${e}`;
		}

		return message;
	}

	triggerSizeChange(value) {
		if (typeof(value) !== "number" || isNaN(value) || value < 0) {
			return;
		}

		const previousValue = this._lastSize;
		if (previousValue !== value) {
			this._lastSize = value;

			this.emit("sizeChanged", {
				previousValue: previousValue,
				value: value
			});
		}
	}

	triggerHeldSizeChange(value) {
		if (typeof(value) !== "number" || isNaN(value) || value < 0) {
			return;
		}

		const previousValue = this._lastHeldSize;
		if (previousValue !== value) {
			this._lastHeldSize = value;

			this.emit("heldSizeChanged", {
				previousValue: previousValue,
				value: value
			});
		}
	}
};
