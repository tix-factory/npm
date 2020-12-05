export default class extends Error {
	constructor(httpRequest, httpResponse) {
		super(`HttpRequest failed.`
			+ `\n\tUrl: ${httpRequest.url}`
			+ `\n\tMethod: ${httpRequest.method}`
			+ `\n\tStatus Code: ${httpResponse.statusCode}`);

		this.httpRequest = httpRequest;
		this.httpResponse = httpResponse;
	}
}