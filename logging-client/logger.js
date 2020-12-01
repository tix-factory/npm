import http from "@tix-factory/http";
import os from "os";
const schemeRegex = /^\w+:/;

export default class {
	constructor(httpClient, logName) {
		let loggingServiceHost = process.env.LoggingServiceHost;
		if (!schemeRegex.test(loggingServiceHost)) {
			loggingServiceHost = `https://${loggingServiceHost}`; 
		}

		this.httpClient = httpClient;
		this.loggingServiceEndpoint = new URL(`${loggingServiceHost}/v1/Log`);
		this.hostName = os.hostname();
		this.logName = logName
	}

	serialize(e) {
		if (e instanceof Error) {
			return e.stack || e.toString();
		} else if (typeof(e) === "string") {
			return e;
		} else if (typeof(e) === "object" || Array.isArray(e)) {
			return JSON.stringify(e);
		} else {
			return `${e}`;
		}
	}

	verbose(...logPieces) {
		this.write("Verbose", logPieces);
	}

	info(...logPieces) {
		this.write("Information", logPieces);
	}

	warn(...logPieces) {
		this.write("Warning", logPieces);
	}

	error(...logPieces) {
		this.write("Error", logPieces);
	}

	write(logLevel, logPieces) {
		this.writeAsync(logLevel, logPieces).then(() => {
			// Logged successfully
		}).catch((err) => {
			console.error("request to logging service failed", err);
		});
	}

	writeAsync(logLevel, logPieces) {
		return new Promise((resolve, reject) => {
			const logData = {
				message: "",
				host: {
					name: this.hostName
				},
				log: {
					name: this.logName,
					level: logLevel
				}
			};
	
			for (let i = 0; i < logPieces.length; i++) {
				logData.message += (logData.message ? " " : "") + this.serialize(logPieces[i]);
			}
	
			const httpRequest = new http.request(http.methods.post, this.loggingServiceEndpoint);
			httpRequest.addOrUpdateHeader("Content-Type", "application/json");
			httpRequest.body = Buffer.from(JSON.stringify(logData));
	
			this.httpClient.send(httpRequest).then((response) => {
				if (response.statusCode === 200 || response.statusCode === 204) {
					resolve();
					return;
				}

				reject({
					data: {
						statusCode: response.statusCode,
						data: logData
					},
					code: "LoggingServiceRequestFailed"
				});
			}).catch((err) => {
				reject({
					data: err,
					code: "Unknown"
				});
			});
		});
	}
};
