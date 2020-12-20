export default class BatchProcessorItem {
	constructor(item, resolve, reject, errorHandler) {
		this.attempts = 0;
		this.item = item;
		this.promises = [];
		this.errorHandler = errorHandler;

		this.promise(resolve, reject);
	}

	incrementAttempts() {
		this.attempts++;
	}

	promise(resolve, reject) {
		this.promises.push({
			resolve: resolve,
			reject: reject
		});
	}

	resolve(data) {
		this.promises.forEach((promise) => {
			try {
				promise.resolve(data);
			} catch (e) {
				try {
					promise.reject(e);
				} catch(rejectError) {
					// Super rip.
					this.errorHandler(rejectError);
				}
			}
		});
	}

	reject(err) {
		this.promises.forEach((promise) => {
			try {
				promise.reject(err);
			} catch(rejectError) {
				// Super rip.
				this.errorHandler(rejectError);
			}
		});
	}
};
