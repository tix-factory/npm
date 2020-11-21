import http from "@tix-factory/http";
import os from "os";

export default class {
	constructor(httpClient, loggingServiceHost, logName) {
		this.httpClient = httpClient;
		this.loggingServiceEndpoint = new URL(`http://${loggingServiceHost}/v1/Log`);
		this.hostName = os.hostname();
		this.logName = logName
	}

	verbose(message) {
		this.write("Verbose", message);
	}

	info(message) {
		this.write("Information", message);
	}

	warn(message) {
		this.write("Warning", message);
	}

	error(message) {
		this.write("Error", message);
	}

	write(logLevel, message) {
		const logData = {
			host: {
				name: this.hostName
			},
			log: {
				name: this.logName,
				level: logLevel
			}
		};

		if (message instanceof Error) {
			logData.message = message.stack || message.toString();
		} else if (typeof(message) === "object" || Array.isArray(message)) {
			logData.message = JSON.stringify(message);
		} else if (typeof(message) === "string") {
			logData.message = message;
		} else {
			logData.message = `${message}`;
		}

		const httpRequest = new http.request(http.methods.post, this.loggingServiceEndpoint);
		httpRequest.addOrUpdateHeader("Content-Type", "application/json");
		httpRequest.body = Buffer.from(JSON.stringify(logData));

		this.httpClient.send(httpRequest).then((response) => {
			if (response.statusCode === 200 || response.statusCode === 204) {
				return;
			}

			console.error(`request to logging service failed (${response.statusCode})`, logData);
		}).catch((err) => {
			console.error("request to logging service failed", logData, err);
		});
	}
};
