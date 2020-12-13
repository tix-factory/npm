import zlib from "zlib";
import HttpHandler from "./httpHandler.js";
import HttpClientError from "../errors/httpClientError.js";
import httpErrors from "../constants/httpErrors.js";

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

export default class extends HttpHandler {
	constructor() {
		super();
	}

	async execute(httpRequest) {
		httpRequest.addOrUpdateHeader("Accept-Encoding", "gzip");

		const httpResponse = await super.execute(httpRequest);

		if (httpResponse.body.length > 0) {
			let contentEncoding = httpResponse.getHeader("content-encoding");
			switch (contentEncoding) {
				case "gzip":
					httpResponse.body = await gunzip(httpResponse.body);
					break;
			}
		}

		return Promise.resolve(httpResponse);
	}
};
