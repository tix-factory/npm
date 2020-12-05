import zlib from "zlib";
import HttpHandler from "./httpHandler.js";
import HttpClientError from "../errors/httpClientError.js";
import httpErrors from "../constants/httpErrors.js";

export default class extends HttpHandler {
	constructor() {
		super();
	}

	execute(httpRequest) {
		return new Promise(async (resolve, reject) => {
			try {
				httpRequest.addOrUpdateHeader("Accept-Encoding", "gzip");

				const httpResponse = await super.execute(httpRequest);

				if (httpResponse.body.length > 0) {
					let contentEncoding = httpResponse.getHeader("content-encoding");
					switch (contentEncoding) {
						case "gzip":
							zlib.gunzip(httpResponse.body, (err, buffer) => {
								if (err) {
									reject(new HttpClientError(httpRequest, httpErrors.contentDecodingFailed, err));
								} else {
									httpResponse.body = buffer;
									resolve(httpResponse);
								}
							});

							return;
					}
				}

				resolve(httpResponse);
			} catch (e) {
				reject(e)
			}
		});
	}
};
