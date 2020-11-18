import http from "@tix-factory/http";

export default class {
	constructor(applicationName) {
		this.applicationMetadata = {
			name: applicationName
		};
	}

	get allowAnonymous() {
		return true;
	}

	get name() {
		return "ApplicationMetadata";
	}

	get route() {
		return "/application-metadata";
	}

	get method() {
		return http.methods.get;
	}

	execute(requestBody) {
		return new Promise((resolve, reject) => {
			resolve(this.applicationMetadata);
		});
	}
};
