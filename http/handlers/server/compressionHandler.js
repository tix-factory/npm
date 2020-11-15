import zlib from "zlib";
import HttpHandler from "../httpHandler.js";
import httpErrors from "../../constants/httpErrors.js";

const tryDecodeRequestBody = (requestBody) => {
	return new Promise((resolve, reject) => {
		const contentEncoding = httpRequest.getHeader("Content-Encoding");
		if (!contentEncoding) {
			resolve(requestBody);
			return;
		}

		switch (contentEncoding) {
			case "gzip":
				zlib.gunzip(requestBody, (err, buffer) => {
					if (err) {
						reject({
							code: httpErrors.contentDecodingFailed,
							data: err
						});
					} else {
						resolve(buffer);
					}
				});

				return;
			default:
				reject({
					code: httpErrors.contentDecodingFailed,
					data: err
				});
				return;
		}
	});
};

const tryEncodeResponseBody = (httpRequest, httpResponse) => {
	return new Promise((resolve, reject) => {
		const acceptEncoding = httpRequest.getHeader("Accept-Encoding");
		if (acceptEncoding) {
			const availableEncodings = acceptEncoding.split(",").map(encoding => encoding.trim().toLowerCase());
			if (availableEncodings.includes("gzip")) {
				zlib.gzip(httpResponse.body, (err, buffer) => {
					if (err) {
						// Failed to encode response body, but that's ok.
						// We'll just... return without encoding...
						resolve(httpResponse.body);
					} else {
						httpResponse.addOrUpdateHeader("Content-Encoding", "gzip");
						resolve(buffer);
					}
				});

				return;
			}
		}

		resolve(responseBody);
	});
};

export default class extends HttpHandler {
	constructor() {
		super();
	}

	execute(httpRequest) {
		return new Promise(async (resolve, reject) => {
			try {
				if (httpRequest.body) {
					httpRequest.body = await tryDecodeRequestBody(httpRequest.body);
				}

				const httpResponse = await super.execute(httpRequest);

				if (httpResponse.body) {
					httpResponse.body = await tryEncodeResponseBody(httpRequest, httpResponse);
				}

				resolve(httpResponse);
			} catch (e) {
				reject(e)
			}
		});
	}
};
