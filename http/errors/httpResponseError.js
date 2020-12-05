import HttpRequestError from "./httpRequestError.js";
const jsonResponseType = "application/json";
const defaultCode = "unknown";

export default class extends HttpRequestError {
	constructor(httpRequest, httpResponse, errorMap) {
		super(httpRequest, httpResponse);

		this.code = defaultCode;

		if (errorMap && httpResponse.statusCode) {
			const contentType = httpResponse.getHeader("Content-Type");
			if (contentType.includes(jsonResponseType)) {
				try {
					const responseBody = JSON.parse(httpResponse.body.toString());
					if (typeof(responseBody.error) === "string") {
						if (errorMap.hasOwnProperty(responseBody.error)) {
							this.code = errorMap[responseBody.error];
						} else {
							for (let key in errorMap) {
								if (key.toLowerCase() === responseBody.error.toLowerCase()) {
									this.code = errorMap[key];
								}
							}
						}
					}
				} catch {
					// Couldn't parse error code
				}
			}
		}
	}
}