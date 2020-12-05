import http from "http";
import https from "https";
import HttpResponse from "./../httpResponse.js";
import HttpClientError from "./../errors/httpClientError.js";
import httpErrors from "./../constants/httpErrors.js";

export default class {
	constructor(httpClientOptions) {
		if (!httpClientOptions.agentOptions) {
			httpClientOptions.agentOptions = {
				keepAlive: true,
				scheduling: "lifo"
			};
		}

		this.httpClientOptions = httpClientOptions;

		this.httpAgent = new http.Agent(httpClientOptions.agentOptions);
		this.httpsAgent = new https.Agent(httpClientOptions.agentOptions);
	}

	execute(httpRequest) {
		return new Promise((resolve, reject) => {
			const requestStarted = (response) => {
				const responseBodyChunks = [];

				response.on("data", chunk => {
					responseBodyChunks.push(chunk);
				});

				response.on("end", () => {
					const httpResponse = new HttpResponse(response.statusCode);
					httpResponse.body = Buffer.concat(responseBodyChunks);

					for (let i = 0; i < response.rawHeaders.length; i += 2) {
						httpResponse.addHeader(response.rawHeaders[i], response.rawHeaders[i + 1]);
					}

					resolve(httpResponse);
				});
			};

			const requestTimeout = httpRequest.timeout || this.httpClientOptions.requestTimeout;
			const requestOptions = {
				method: httpRequest.method.toUpperCase(),
				headers: {},
				timeout: requestTimeout
			};

			httpRequest.headers.forEach(header => {
				requestOptions.headers[header.name] = header.value;
			});
			
			switch (httpRequest.url.protocol) {
				case "http:":
				case "https:":
					requestOptions.agent = httpRequest.url.protocol === "http:" ? this.httpAgent : this.httpsAgent;

					const request = httpRequest.url.protocol === "http:" ? http.request(httpRequest.url, requestOptions, requestStarted) : https.request(httpRequest.url, requestOptions, requestStarted);

					// https://stackoverflow.com/a/55021202/1663648
					let timeout = false;
					request.on("timeout", () => {
						timeout = true;
						request.abort()
					});

					request.on("error", e => {
						reject(new HttpClientError(httpRequest, timeout ? httpErrors.timeout : httpErrors.unknown, e));
					});

					if (httpRequest.body) {
						request.write(httpRequest.body);
					}

					request.end();

					return;
				default:
					reject(new HttpClientError(httpRequest, httpErrors.unrecognizedProtocol));
			}
		});
	}
}