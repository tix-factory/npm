const buildMessage = (httpRequest, code) => {
	let message = `HttpClientError: ${code}`;

	if (httpRequest) {
		message += `\n\tUrl: ${httpRequest.url}`;
		message += `\n\tMethod: ${httpRequest.method}`;
	}
};

export default class extends Error {
	constructor(httpRequest, code, innerError) {
		super(buildMessage(httpRequest, code));

		this.httpRequest = httpRequest;
		this.code = code;
		this.innerError = innerError;
	}
}