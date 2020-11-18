import fs from "fs";
import http from "@tix-factory/http";

export default class {
	constructor(faviconFileName) {
		this.faviconBuffer = null;
		this.faviconFileName = faviconFileName;
		this.loadFavicon();
	}

	get allowAnonymous() {
		return true;
	}

	get name() {
		return "favicon";
	}

	get route() {
		return "/favicon.ico";
	}

	get method() {
		return http.methods.get;
	}

	execute(requestBody) {
		return new Promise((resolve, reject) => {
			if (this.faviconBuffer) {
				const httpResponse = new http.response(200);
				httpResponse.addOrUpdateHeader("Content-Type", "image/x-icon");
				httpResponse.body = this.faviconBuffer;

				resolve(httpResponse);
			} else {
				const httpResponse = new http.response(404);
				httpResponse.addOrUpdateHeader("Content-Type", "application/json");
				httpResponse.body = Buffer.from("{}");

				resolve(httpResponse);
			}
		});
	}

	loadFavicon() {
		fs.readFile(this.faviconFileName, (err, buffer) => {
			if (!err) {
				this.faviconBuffer = buffer;
			}
		});
	}
};
