import HttpClientHandler from "./httpClientHandler.js";

export default class extends HttpClientHandler {
	constructor(cookiejar, cookieSaver) {
		super();

		this._cookiejar = cookiejar;
		this._cookieSaver = cookieSaver;
	}

	execute(httpRequest) {
		return new Promise(async (resolve, reject) => {
			try {
				const cookie = this._cookiejar.getCookies({
					domain: httpRequest.url.hostname,
					path: httpRequest.url.pathname
				}).toValueString();

				if (cookie.length > 0) {
					httpRequest.addOrUpdateHeader("Cookie", cookie);
				}

				const httpResponse = await super.execute(httpRequest);

				let gotCookies = false;
				httpResponse.headers.forEach(function (header) {
					if (header.name.toLowerCase() === "set-cookie") {
						this._cookiejar.setCookie(header.value, url.hostname, url.pathname);
					}
				});

				if (gotCookies) {
					this._cookieSaver(this._cookiejar);
				}

				resolve(httpResponse);
			} catch (e) {
				reject(e)
			}
		});
	}
};
