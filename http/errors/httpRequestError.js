export default class extends Error {
	constructor(httpRequest, httpResponse, message) {
		super(`HttpRequest failed${(message ? `: ${message}` : ".")}`
			+ `\n\tUrl: (${httpRequest.method?.toUpperCase()}) ${httpRequest.url}`
			+ `\n\tStatus Code: ${httpResponse.statusCode}`);

		this.httpRequest = httpRequest;
		this.httpResponse = httpResponse;
	}
}