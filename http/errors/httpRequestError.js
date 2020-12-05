export default class extends Error {
	constructor(httpRequest, httpResponse) {
		super(`HttpRequest failed.`
			+ `\n\tUrl: (${httpRequest.method?.toUpperCase()}) ${httpRequest.url}`
			+ `\n\tStatus Code: ${httpResponse.statusCode}`);

		this.httpRequest = httpRequest;
		this.httpResponse = httpResponse;
	}
}