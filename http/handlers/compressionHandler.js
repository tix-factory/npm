const zlib = require("zlib");

import HttpClientHandler from "./httpClientHandler.js";
import httpErrors from "../constants/httpErrors.js";

export default class extends HttpClientHandler {
	constructor() {
		super();
	}

	execute(httpRequest) {
		return new Promise(async (resolve, reject) => {
			try {
				const httpResponse = await super.execute(httpRequest);

				if (httpResponse.body.length > 0) {
					let contentEncoding = httpResponse.getHeader("content-encoding");
					switch (contentEncoding) {
						case "gzip":
							zlib.gunzip(httpResponse.body, (err, buffer) => {
								if (err) {
									reject({
										code: httpErrors.contentDecodingFailed,
										data: err
									})
								} else {
									httpResponse.body = buffer;
									resolve(httpResponse);
								}
							});

							return;
					}

					resolve(httpResponse);
				}
			} catch (e) {
				reject(e)
			}
		});
	}
};
