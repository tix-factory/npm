import { HttpRequest, httpMethods, HttpRequestError } from "@tix-factory/http";
import { BatchItemProcessor } from "@tix-factory/queueing";
import os from "os";
import LogError from "./logError.js";
import GenerateHash from "./generateHash.js";

const schemeRegex = /^\w+:/;
const whitespaceRegex = /\s+^/;

export default class {
	constructor(httpClient, logName) {
		let loggingServiceHost = process.env.LoggingServiceHost;
		if (!schemeRegex.test(loggingServiceHost)) {
			loggingServiceHost = `https://${loggingServiceHost}`; 
		}

		this.httpClient = httpClient;
		this.loggingServiceEndpoint = new URL(`${loggingServiceHost}/v1/BatchLog`);
		this.hostName = os.hostname();
		this.logName = logName;

		this.batchLogProcessor = new BatchItemProcessor({
			deduplicateItems: false,
			minProcessDelay: 500
		}, this.batchLog.bind(this), err => {
			console.error("logger failed to log", err);
		});
	}

	serialize(e) {
		if (e instanceof Error) {
			let message = "";
			if (e.stack) {
				if (e.stack.includes(e.message)) {
					message = e.stack;
				} else {
					message = `${e.message}\n${e.stack}`;
				}
			} else {
				message = e.message || e.toString();
			}
			
			if (e.innerError) {
				message += `\nINNER ERROR\n${this.serialize(e.innerError)}`;
			}

			return message;
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
			console.error("request to logging service failed", err, err?.logData);
		});
	}

	writeAsync(logLevel, logPieces) {
		return new Promise((resolve, reject) => {
			const logData = {
				id: GenerateHash(),
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
				let whitespacePrepend = "";
				if (logData.message && !whitespaceRegex.test(logData.message)) {
					whitespacePrepend = " ";
				}

				logData.message += whitespacePrepend + this.serialize(logPieces[i]);
			}

			this.batchLogProcessor.push(logData).then(resolve).catch(reject);
		});
	}

	async batchLog(logDataArray) {
		try {
			const httpRequest = new HttpRequest(httpMethods.post, this.loggingServiceEndpoint);
			httpRequest.addOrUpdateHeader("Content-Type", "application/json");
			httpRequest.body = Buffer.from(JSON.stringify(logDataArray));

			const httpResponse = await this.httpClient.send(httpRequest);
			if (httpResponse.statusCode === 200) {
				const responseBody = JSON.parse(httpResponse.body.toString());
				const logDataById = Object.fromEntries(logDataArray.map(l => [l.id, l]));
				const logResult = [];

				responseBody.successfulLogIds.forEach(id => {
					logResult.push({
						item: logDataById[id],
						success: true
					});
				});

				responseBody.failedLogIds.forEach(id => {
					logResult.push({
						item: logDataById[id],
						reject: new LogError(httpRequest, httpResponse, logDataById[id])
					});
				});

				return Promise.resolve(logResult);
			} else {
				return Promise.reject(new HttpRequestError(httpRequest, httpResponse));
			}
		} catch (e) {
			return Promise.reject(e);
		}
	}
};
