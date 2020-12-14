import zlib from "zlib";
import HttpHandler from "./httpHandler.js";
import HttpClientError from "../errors/httpClientError.js";
import httpErrors from "../constants/httpErrors.js";
const minEncodedRequestBodyLength = 256;

const gunzip = (encodedBuffer) => {
	return new Promise((resolve, reject) => {
		zlib.gunzip(encodedBuffer, (err, buffer) => {
			if (err) {
				reject(new HttpClientError(httpRequest, httpErrors.contentDecodingFailed, err));
			} else {
				resolve(buffer);
			}
		});
	});
};

const gzip = (buffer) => {
	return new Promise((resolve, reject) => {
		zlib.gzip(buffer, (err, encodedBuffer) => {
			if (err) {
				reject(err);
			} else {
				resolve(encodedBuffer);
			}
		});
	});
};

export default class extends HttpHandler {
	constructor() {
		super();
	}

	async execute(httpRequest) {
		httpRequest.addOrUpdateHeader("Accept-Encoding", "gzip");

		if (httpRequest.body && httpRequest.body.length >= minEncodedRequestBodyLength) {
			const requestContentEncoding = httpRequest.getHeader("content-encoding");
			switch (requestContentEncoding) {
				case "gzip":
					httpRequest.body = await gzip(httpRequest.body);
					break;
			}
		}

		const httpResponse = await super.execute(httpRequest);

		if (httpResponse.body.length > 0) {
			const responseContentEncoding = httpResponse.getHeader("content-encoding");
			switch (responseContentEncoding) {
				case "gzip":
					httpResponse.body = await gunzip(httpResponse.body);
					break;
			}
		}

		return Promise.resolve(httpResponse);
	}
};
