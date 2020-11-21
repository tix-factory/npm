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

	processQueue() {
		if (this._runningThreads >= this.options.numberOfThreads) {
			return;
		}

		++this._runningThreads;

		this.queue.lease(this.options.itemLockDurationInMilliseconds).then(async queueItem => {
			if (!queueItem) {
				--this._runningThreads;
				return;
			}

			try {
				const result = await this.processItem(queueItem.item);
				if (result) {
					this.queue.remove(queueItem.id, queueItem.leaseId).then(() => {
						// yay it was removed from the queue, cause it was processed yay
					}).catch(err => {
						if (err.code === queueError.invalidLeaseId) {
							return;
						}

						if (this.options.errorHandler) {
							this.options.errorHandler(err);
						}
					});
				} else {
					setTimeout(() => {
						this.queue.release(queueItem.id, queueItem.leaseId).then(() => {
							// woo, released!
							// now something else can take it
						}).catch(err => {
							if (err.code === queueError.invalidLeaseId) {
								return;
							}

							if (this.options.errorHandler) {
								this.options.errorHandler(err);
							}
						});
					}, this.options.itemRetryDelayInMilliseconds);
				}
			} catch (e) {
				this.options.errorHandler(err);
			} finally {
				--this._runningThreads;
			}
		}).catch((err) => {
			--this._runningThreads;
			if (this.options.errorHandler) {
				this.options.errorHandler(err);
			}
		});
	}
};
