import HttpHandler from "./httpHandler.js";
import HttpRequest from "./../httpRequest.js";
import HttpClientError from "./../errors/httpClientError.js";
import httpErrors from "./../constants/httpErrors.js";
import httpMethods from "./../constants/httpMethods.js";

export default class extends HttpHandler {
	constructor(httpClientOptions) {
		super();

		this._httpClientOptions = httpClientOptions;
	}

	async execute(httpRequest) {
		let redirects = 0;

		do {
			const httpResponse = await super.execute(httpRequest);

			let location = httpResponse.getHeader("location");
			if (location) {
				// TODO: Check this logic for security holes.
				if (location.startsWith("/")) {
					httpRequest = new HttpRequest(httpMethods.get, new URL(location, `${httpRequest.url.protocol}//${httpRequest.url.host}:${httpRequest.url.port}`));
				} else {
					httpRequest = new HttpRequest(httpRequest.get, new URL(location));
				}

				continue;
			}

			httpResponse.url = httpRequest.url;
			
			return Promise.resolve(httpResponse);
		} while (redirects <= this._httpClientOptions.maxRedirects);

		return Promise.reject(new HttpClientError(httpRequest, httpErrors.maxRedirects));
	}
};
