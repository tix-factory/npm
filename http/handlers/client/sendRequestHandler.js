import http from "http";
import https from "https";
import HttpResponse from "./../../httpResponse.js";
import httpErrors from "./../../constants/httpErrors.js";

export default class {
	constructor(httpClientOptions) {
		this.httpClientOptions = httpClientOptions;
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

			const requestError = (e) => {
				reject({
					code: httpErrors.unknown,
					data: e
				});
			};

			const requestOptions = {
				method: httpRequest.method.toUpperCase(),
				headers: {}
			};

			httpRequest.headers.forEach(header => {
				requestOptions.headers[header.name] = header.value;
			});

			const requestTimeout = httpRequest.timeout || this.httpClientOptions.requestTimeout;
			
			switch (httpRequest.url.protocol) {
				case "http:":
				case "https:":
					const request = httpRequest.url.protocol === "http:" ? http.request(httpRequest.url, requestOptions, requestStarted) : https.request(httpRequest.url, requestOptions, requestStarted);

					request.on("socket", socket => {
						socket.setTimeout(requestTimeout, () => socket.destroy());
					});

					request.on("error", requestError);

					if (httpRequest.body) {
						request.write(httpRequest.body);
					}

					request.end();

					return;
				default:
					reject({
						code: httpErrors.unrecognizedProtocol,
						data: httpRequest.url.protocol
					});
			}
		});
	}
}