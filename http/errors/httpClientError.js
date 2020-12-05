const buildMessage = (httpRequest, code) => {
	let message = `HttpClientError: ${code}`;

	if (httpRequest) {
		message += `\n\tUrl: (${httpRequest.method?.toUpperCase()}) ${httpRequest.url}`
	}

	return message;
};

export default class extends Error {
	constructor(httpRequest, code, innerError) {
		super(buildMessage(httpRequest, code));

		this.httpRequest = httpRequest;
		this.code = code;
		this.innerError = innerError;
	}
}