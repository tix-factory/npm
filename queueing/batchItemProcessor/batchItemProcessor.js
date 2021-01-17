import BatchProcessorItem from "./batchProcessorItem.js";
import BatchErrorCodes from "./batchErrorCodes.js";
import BatchError from "./batchError.js";

export default class {
	constructor(settings, batchProcessor, errorHandler, batchGetter) {
		// batchProcesor is a function that should return a promise
		// errorHandler is a function that should return void (recieves one argument: the error from the batchProcessor reject or individual item reject)
		let defaultSettings = {
			batchSize: 100,
			maxAttempts: 5,
			retryCooldownInMilliseconds: 500,
			deduplicateItems: true,

			// The max number of items that can be queued for batching at a single time.
			// If the queue.length exceeds this, new pushes will be rejected.
			maxQueueSize: Infinity,

			// Wait at least 0 milliseconds before processing after an item has been pushed into the queue.
			// * Only applicable if the queue size is below the batchSize.
			processDelay: 0,

			// Wait at least 0 milliseconds before processing a batch
			minProcessDelay: 0,

			// Wait no longer than 1,000 milliseconds before processing a batch
			// TODO: Implement
			// maxProcessDelay: 1000
		};

		this.queue = [];
		this.settings = {};
		this.deduplicationItems = {};
		this.processor = batchProcessor;
		this.errorHandler = errorHandler;
		this.batchGetter = batchGetter || this.getBatch.bind(this);
		this.running = false;
		this.nextProcessTime = 0;

		for (let settingName in defaultSettings) {
			let settingValue = defaultSettings[settingName];
			if (settings.hasOwnProperty(settingName)) {
				settingValue = settings[settingName];
			}

			this.settings[settingName] = settingValue;
		}
	}

	getBatch(queue, batchSize) {
		return queue.slice(0, batchSize);
	}

	push(item) {
		return new Promise((resolve, reject) => {
			let batchProcessorItem;
			let deduplicationKey = null;

			if (this.settings.deduplicateItems) {
				deduplicationKey = this.createDeduplicationKey(item);
				batchProcessorItem = this.deduplicationItems[deduplicationKey];
				if (batchProcessorItem) {
					batchProcessorItem.promise(resolve, reject);
					return;
				}
			}

			if (this.queue.length >= this.settings.maxQueueSize) {
				reject(new BatchError(BatchErrorCodes.queueFull, item, `The batch item queue has exceeded the limit (limit: ${this.settings.maxQueueSize}, queue size: ${this.queue.length}).`));
				return;
			}

			batchProcessorItem = new BatchProcessorItem(item, resolve, reject, this.handleError);
			if (deduplicationKey) {
				const deleteDeduplicationItem = () => {
					delete this.deduplicationItems[deduplicationKey];
				};

				this.deduplicationItems[deduplicationKey] = batchProcessorItem;
				batchProcessorItem.promise(deleteDeduplicationItem, deleteDeduplicationItem);
			}

			this.queue.push(batchProcessorItem);

			if (this.queue.length >= this.settings.batchSize || this.settings.processDelay <= 0) {
				this.process();
			} else {
				setTimeout(() => this.process(), this.settings.processDelay);
			}
		});
	}

	retry(item) {
		setTimeout(() => {
			this.queue.push(item);
			this.process();
		}, this.settings.retryCooldownInMilliseconds);
	}

	process() {
		if (this.running || this.queue.length <= 0) {
			return;
		}

		this.running = true;
		let processItems = [];
		let batch = this.batchGetter(this.queue, this.settings.batchSize);

		if (batch.length <= 0) {
			this.running = false;
			return;
		}

		if (this.settings.minProcessDelay > 0) {
			const currentTime = +new Date;
			if (currentTime < this.nextProcessTime) {
				setTimeout(() => this.process(), (this.nextProcessTime - currentTime) + 1);
				this.running = false;
				return;
			}

			this.nextProcessTime = currentTime + this.settings.minProcessDelay;
		}

		batch.forEach((item) => {
			var index = this.queue.indexOf(item);
			if (index >= 0) {
				this.queue.splice(index, 1);
			}

			item.incrementAttempts();
			processItems.push(item.item);
		});

		this.processor(processItems).then((processResult) => {
			batch.forEach((item) => {
				var processedItem = processResult.find(p => p.item === item.item);

				if (processedItem && processedItem.reject) {
					item.reject(processedItem.reject);
				} else if (processedItem && processedItem.success) {
					item.resolve(processedItem.value);
				} else if (item.attempts < this.settings.maxAttempts) {
					this.retry(item);
				} else {
					item.reject(new BatchError(BatchErrorCodes.maxAttempts, item.item, `Item not returned in batch processing result after max attempts.\n\tKey: ${this.createDeduplicationKey(item.item)}`));
				}
			});

			this.running = false;
			this.process();
		}).catch((error) => {
			this.handleError(error);

			batch.forEach((item) => {
				if (item.attempts < this.settings.maxAttempts) {
					this.retry(item);
				} else {
					const batchError = new BatchError(BatchErrorCodes.maxAttempts, item.item, `Item was caught in rejected batch processing result after max attempts.\n\tKey: ${this.createDeduplicationKey(item.item)}`);
					batchError.innerError = error;

					item.reject(batchError);
				}
			});

			this.running = false;
			this.process();
		});
	}

	handleError(error) {
		if (typeof (this.errorHandler) === "function") {
			try {
				this.errorHandler(error);
			} catch (e) {
				console.error("'errorHandler' failed to handle error", e, error);
			}

			return;
		}

		// Into the void...
	}

	createDeduplicationKey(item) {
		return JSON.stringify(item);
	}
};
