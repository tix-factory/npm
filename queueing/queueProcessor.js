import queueError from "./queueError.js";

export default class {
	constructor(options, queue, processItem) {
		if (!options || typeof (options) !== "object") {
			options = {};
		}

		if (!options.numberOfThreads) {
			options.numberOfThreads = 10;
		}

		if (!options.itemLockDurationInMilliseconds) {
			options.itemLockDurationInMilliseconds = 5 * 60 * 1000;
		}

		if (!options.itemRetryDelayInMilliseconds) {
			options.itemRetryDelayInMilliseconds = 5 * 60 * 1000;
		}

		this.options = options;
		this.queue = queue;
		this.processItem = processItem;

		this._runningThreads = 0;

		queue.on("sizeChanged", this.processQueue.bind(this));
		queue.on("heldSizeChanged", this.processQueue.bind(this));

		this.processQueue();
	}

	async processQueue() {
		if (this._runningThreads >= this.options.numberOfThreads) {
			return;
		}

		++this._runningThreads;
		let queueItem = null;

		try {
			queueItem = await this.queue.lease(this.options.itemLockDurationInMilliseconds);
			if (!queueItem) {
				--this._runningThreads;
				return;
			}

			if (this._runningThreads < this.options.numberOfThreads) {
				setTimeout(this.processQueue.bind(this), 0);
			}

			const result = await this.processItem(queueItem.item);
			if (result) {
				this.queue.remove(queueItem.id, queueItem.leaseId).then(() => {
					// yay it was removed from the queue, cause it was processed yay
				}).catch(err => {
					if (err.code && err.code.toLowerCase() === queueError.invalidLeaseHolder.toLowerCase()) {
						return;
					}

					this.handleError("removing queue item", queueItem, err);
				});
			} else {
				setTimeout(() => {
					this.queue.release(queueItem.id, queueItem.leaseId).then(() => {
						// woo, released!
						// now something else can take it
					}).catch(err => {
						if (err.code && err.code.toLowerCase() === queueError.invalidLeaseHolder.toLowerCase()) {
							return;
						}

						this.handleError("releasing queue item", queueItem, err);
					});
				}, this.options.itemRetryDelayInMilliseconds);
			}

			--this._runningThreads;
			this.processQueue();
		} catch (e) {
			--this._runningThreads;
			this.processQueue();
			this.handleError("processing queue item", queueItem, e);
		}
	}

	handleError(detail, queueItem, e) {
		if (!this.options.errorHandler) {
			return;
		}

		let message = "";
		let queueItemData = "";

		if (e instanceof Error) {
			message = e.stack || e.toString();
		} else if (typeof(e) === "object" || Array.isArray(e)) {
			message = JSON.stringify(e);
		} else if (typeof(e) === "string") {
			message = e;
		} else {
			message = `${e}`;
		}

		if (queueItem) {
			queueItemData = JSON.stringify(queueItem);
		}

		this.options.errorHandler(`Unhandled exception ${detail}\n${queueItemData}\n\n${message}`);
	}
};
