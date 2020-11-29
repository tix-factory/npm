import EventEmitter from "events";
import generateHash from "./generateHash.js";
import lock from "./lock.js";
import queueError from "./queueError.js";

export default class extends EventEmitter {
	constructor() {
		super();

		this._queue = [];
		this._lastSize = 0;
		this._heldSize = 0;
		this._lockKey = generateHash();
	}

	getQueueSize() {
		return Promise.resolve(this._queue.length);
	}

	getHeldQueueSize() {
		return Promise.resolve(this._lastHeldSize);
	}

	push(item) {
		return new Promise((resolve, reject) => {
			let queueItem = {
				id: generateHash(),
				lockExpiration: 0,
				lockHolder: null,
				locked: false,
				item: item
			};

			lock(this._lockKey, () => {
				let lastQueueSize = this._queue.length;
				this._queue.push(queueItem);
				this.triggerSizeChange(lastQueueSize, this._queue.length);
			});

			resolve({});
		});
	}

	lease(expiryInMilliseconds) {
		return new Promise((resolve, reject) => {
			lock(this._lockKey, () => {
				let currentTime = +new Date;
				let queueItem = null;

				for (let i = 0; i < this._queue.length; i++) {
					queueItem = this._queue[i];
					if (!queueItem.locked) {
						queueItem.locked = true;
						queueItem.lockExpiration = currentTime + expiryInMilliseconds;
						break;
					}

					queueItem = null;
				}

				if (queueItem) {
					let lockHolder = generateHash();
					queueItem.lockHolder = lockHolder;

					let lastHeldSize = this._heldSize++;
					this.triggerHeldSizeChange(lastHeldSize, this._heldSize);
					
					setTimeout(() => {
						if (queueItem.lockHolder !== lockHolder || !queueItem.locked) {
							return;
						}

						lastHeldSize = this._heldSize--;
						this.triggerHeldSizeChange(lastHeldSize, this._heldSize);

						queueItem.locked = false;
					}, expiryInMilliseconds);

					resolve({
						id: queueItem.id,
						leaseId: lockHolder,
						item: queueItem.item
					});
				} else {
					resolve(null);
				}
			});
		});
	}

	remove(id, leaseId) {
		return new Promise((resolve, reject) => {
			lock(this._lockKey, () => {
				let queueSize = this._queue.length;

				for (let i = 0; i < queueSize; i++) {
					let queueItem = this._queue[i];
					if (queueItem.id !== id) {
						continue;
					}

					if (queueItem.lockHolder === leaseId && queueItem.locked) {
						queueItem.lockExpiration = Infinity;
						queueItem.locked = false;

						this._queue.splice(i, 1);
						this.triggerSizeChange(queueSize, queueSize - 1);
						
						let lastHeldSize = this._heldSize--;
						this.triggerHeldSizeChange(lastHeldSize, this._heldSize);

						resolve({});

						return;
					} else {
						reject({
							code: queueError.invalidLeaseHolder
						});

						return;
					}
				}
			});
		});
	}

	release(id, leaseId) {
		return new Promise((resolve, reject) => {
			lock(this._lockKey, () => {
				for (let i = 0; i < this._queue.length; i++) {
					let queueItem = this._queue[i];
					if (queueItem.id !== id) {
						continue;
					}

					if (queueItem.lockHolder === leaseId && queueItem.locked) {
						queueItem.lockExpiration = 0;
						queueItem.locked = false;
						
						let lastHeldSize = this._heldSize--;
						this.triggerHeldSizeChange(lastHeldSize, this._heldSize);

						resolve({});

						return;
					} else {
						reject({
							code: queueError.invalidLeaseHolder
						});

						return;
					}
				}
			});
		});
	}

	clear() {
		return new Promise((resolve, reject) => {
			lock(this._lockKey, () => {
				let length = this._queue.length;
				this._queue = [];

				this.triggerSizeChange(length, 0);
				resolve(length);
			});
		});
	}

	triggerSizeChange(previousValue, value) {
		if (previousValue !== value) {
			this.emit("sizeChanged", {
				previousValue: previousValue,
				value: value
			});
		}
	}

	triggerHeldSizeChange(previousValue, value) {
		if (previousValue !== value) {
			this.emit("heldSizeChanged", {
				previousValue: previousValue,
				value: value
			});
		}
	}
};
