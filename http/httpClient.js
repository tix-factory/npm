import cookiejar from "cookiejar";
import CompressionHandler from "./handlers/compressionHandler.js";
import RedirectHandler from "./handlers/redirectHandler.js";
import CookieHandler from "./handlers/cookieHandler.js";
import SendRequestHandler from "./handlers/sendRequestHandler.js";

const blankCookieSaver = (cookiejar) => {};

export default class {
	constructor(options) {
		if (!options || typeof (options) !== "object") {
			options = {};
		}

		if (!options.hasOwnProperty("userAgent")) {
			options.userAgent = "tix-factory-http-client";
		}

		if (!options.hasOwnProperty("handlers")) {
			options.handlers = [];
		}

		if (!options.hasOwnProperty("maxRedirects")) {
			options.maxRedirects = 20;
		}

		const compressionHandler = new CompressionHandler();
		const redirectHandler = new RedirectHandler(options);
		const cookieHandler = new CookieHandler(options.cookiejar || new cookiejar.CookieJar(), options.cookieSaver || blankCookieSaver);
		const sendRequestHandler = new SendRequestHandler(options);

		options.handlers.push(redirectHandler);
		options.handlers.push(compressionHandler);
		options.handlers.push(cookieHandler);

		for (let i = 0; i < options.handlers.length; i++) {
			let handler = options.handlers[i];

			if (i + 1 === options.handlers.length) {
				handler.setNextHandler(sendRequestHandler);
			} else {
				handler.setNextHandler(options.handlers[i + 1]);
			}
		}

		this.options = options;
	}

	send(httpRequest) {
		return new Promise(async (resolve, reject) => {
			try {
				const httpResponse = await this.options.handlers[0].execute(httpRequest);
				resolve(httpResponse);
			} catch (e) {
				reject(e);
			}
		});
	}
}
