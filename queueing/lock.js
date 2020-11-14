const callbacks = {};
let running = false;

const process = (key) => {
	if (running || callbacks[key].length < 1) {
		return;
	}

	running = true;

	try {
		let callback = callbacks[key].shift();
		callback();
	} finally {
		running = false;
		setTimeout(() => process(key), 0);
	}
};

export default (key, callback) => {
	if (!callbacks.hasOwnProperty(key)) {
		callbacks[key] = [];
	}

	callbacks[key].push(callback);
	process(key);
};
