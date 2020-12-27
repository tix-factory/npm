// Based on snowflake.. but not exactly snowflake
// Designed to stay under the Number.MAX_SAFE_INTEGER (15 digits, 999 trillion)
// For thread safety, if you are planning to run this on multiple servers, please set the serverId in the options.
// Otherwise you risk the generateHostId (1 in 1,000 chance) that it matches another server.
import os from "os";

const padId = (id, digits) => {
	// By default this also handles roll overs.
	// padId(1000, 3) -> 000
	const padding = ("0").repeat(digits);
	return (`${padding}${id}`).slice(-digits);
};

const generateHostId = (serverIdLength) => {
	const host = os.hostname();
	let id = 0;

	for (let i = 0; i < host.length; i++) {
		id += host.charCodeAt(i) * i;
	}

	return padId(id, serverIdLength);
};

class IdGenerator {
	constructor(options) {
		if (!options) {
			options = {};
		}

		if (options.idEpoch) {
			if (options.idEpoch > +new Date) {
				throw new Error(`idEpoch cannot be greater than the current time.`);
			}
		} else {
			options.idEpoch = new Date("2020-01-01T00:00:00.000Z");
		}

		if (options.serverIdLength) {
			if (options.serverIdLength < 1) {
				throw new Error(`serverIdLength must be at least 1`);
			}
		} else {
			options.serverIdLength = 3;
		}

		if (options.serverId) {
			let serverId = Number(options.serverId);
			if (isNaN(serverId)) {
				throw new Error(`serverId is NaN`);
			} else if (serverId < 0) {
				throw new Error(`serverId is negative`);
			}

			options.serverId = padId(serverId, options.serverIdLength);
		} else {
			options.serverId = generateHostId(options.serverIdLength);
		}

		if (options.idsPerSecond) {
			// TODO: Some sort of validation here.. the idsPerSecond should go up only with orders of magnitude.
		} else {
			options.idsPerSecond = 1000;
		}

		options.idBase = options.idsPerSecond - 1;
		options.idLength = options.idsPerSecond.toString().length - 1;

		this.options = options;
	}

	generateTimestamp() {
		const currentTime = +new Date;
		const idTime = (currentTime - this.options.idEpoch.getTime()).toString();
		return padId(Number(idTime.substring(0, idTime.length - 3)), 9);
	}

	generate() {
		let idIncrement = ++this.options.idBase;
		if (idIncrement >= this.options.idsPerSecond) {
			const timestamp = this.generateTimestamp();
			if (timestamp === this.options.timestamp) {
				throw new Error(`Could not generate id: Cap per second hit.`);
			}

			this.options.timestamp = timestamp;
			this.options.idBase = -1;

			return this.generate();
		}

		// Timestamp: 9 digits (maybe 8 depending on the id epoch)
		// Server ID: 3 digits (assumed)
		// Increment: 3 digits (assumed)
		return Number(`${this.options.timestamp}${this.options.serverId}${padId(idIncrement, this.options.idLength)}`);
	}
}

export default IdGenerator;
