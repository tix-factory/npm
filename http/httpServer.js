import http from "http";
import HttpRequest from "./httpRequest.js";

export default class {
	constructor(options, requestHandler) {
		if (!options || typeof (options) !== "object") {
			options = {};
		}

		if (!options.port) {
			options.port = 3000;
		}

		if (!options.handlers) {
			options.handlers = [];
		}

		this.options = options;
		this.requestHandler = requestHandler;
		this.server = http.createServer(this.requestStarted.bind(this));

		this.server.listen(options.port);
	}
	
	requestStarted(request, response) {
		const requestBodyChunks = [];

		request.on("data", chunk => {
			requestBodyChunks.push(chunk);
		});

		request.on("end", async () => {
			if (!request.complete) {
				// Request disconnected before being fully downloaded.
				return;
			}

			const httpRequest = new HttpRequest(request.method.toLowerCase(), new URL(`https://${request.headers.host}${request.url}`));
			httpRequest.body = Buffer.concat(requestBodyChunks);

			for (let i = 0; i < request.rawHeaders.length; i += 2) {
				httpRequest.addHeader(request.rawHeaders[i], request.rawHeaders[i + 1]);
			}

			try {
				const httpResponse = await this.requestHandler(httpRequest);

				const headers = [];

				httpResponse.addOrUpdateHeader("Content-Length", httpResponse.body ? httpResponse.body.length : 0);
				httpResponse.headers.forEach(header => {
					headers.push(header.name);
					headers.push(header.value);
				});

				response.writeHead(httpResponse.statusCode, headers);

				if (httpResponse.body) {
					response.write(httpResponse.body);
				}
			} catch (e) {
				if (this.options.errorHandler) {
					this.options.errorHandler(e);
				}
			} finally {
				response.end();
			}
		});
	}
};