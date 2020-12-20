import { CookieJar, CookieAccessInfo } from "cookiejar";

export default class extends CookieJar {
	constructor() {
		super();
	}

	load(serializedCookies) {
		return new Promise((resolve, reject) => {
			if (!serializedCookies) {
				resolve();
				return;
			}

			try {
				const cookieBuffer = Buffer.from(serializedCookies, "base64");
				const cookieBufferString = cookieBuffer.toString();
				const serializedCookiesArray = JSON.parse(cookieBufferString);

				if (serializedCookiesArray.length > 0) {
					this.setCookies(serializedCookiesArray);
				}

				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	serialize() {
		return new Promise((resolve, reject) => {
			try {
				const allCookies = this.getCookies(CookieAccessInfo.All);
				const cookiesStrings = allCookies.map(cookie => cookie.toString());
				const serializedCookiesArray = JSON.stringify(cookiesStrings);
				const cookieBuffer = Buffer.from(serializedCookiesArray);
				const serializedCookies = cookieBuffer.toString("base64");
				resolve(serializedCookies);
			} catch (e) {
				reject(e);
			}
		});
	}
}
