const callbacks = {};
let running = false;

const process = (key) => {
	if (running || callbacks[key].length < 1) {
		return;
	}

	running = true;
	let released = false;

	const releaseLock = () => {
		if (released) {
			return;
		}

		running = false;
		released = true;
		setTimeout(() => process(key), 0);
	};

	try {
		let callback = callbacks[key].shift();
		callback(releaseLock);
	} finally {
		releaseLock();
	}
};

export default (key, callback) => {
	if (!callbacks.hasOwnProperty(key)) {
		callbacks[key] = [];
	}

	callbacks[key].push(callback);
	process(key);
};
