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

	get contentType() {
		return "image/x-icon";
	}

	get rawResult() {
		return true;
	}

	execute() {
		if (this.faviconBuffer) {
			return Promise.resolve(this.faviconBuffer);
		} else {
			return Promise.reject("NoFavicon");
		}
	}

	loadFavicon() {
		fs.readFile(this.faviconFileName, (err, buffer) => {
			if (!err) {
				this.faviconBuffer = buffer;
			}
		});
	}
};
