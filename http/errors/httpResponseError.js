import HttpRequestError from "./httpRequestError.js";
const jsonResponseType = "application/json";
const defaultCode = "unknown";

const getErrorCode = (httpResponse, errorMap) => {
	let code = defaultCode;

	if (errorMap && httpResponse.statusCode) {
		const contentType = httpResponse.getHeader("Content-Type");
		if (contentType.includes(jsonResponseType)) {
			try {
				const responseBody = JSON.parse(httpResponse.body.toString());
				if (typeof(responseBody.error) === "string") {
					if (errorMap.hasOwnProperty(responseBody.error)) {
						code = errorMap[responseBody.error];
					} else {
						for (let key in errorMap) {
							if (key.toLowerCase() === responseBody.error.toLowerCase()) {
								code = errorMap[key];
							}
						}
					}
				}
			} catch {
				// Couldn't parse error code
			}
		}
	}

	return code;
};

const getMessage = errorCode => {
	if (!errorCode || errorCode == defaultCode) {
		return "";
	}

	return errorCode;
};

export default class extends HttpRequestError {
	constructor(httpRequest, httpResponse, errorMap) {
		super(httpRequest, httpResponse, getMessage(getErrorCode(httpResponse, errorMap)));
		this.code = getErrorCode(httpResponse, errorMap);
	}
}