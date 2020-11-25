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

	get rawResult() {
		return true;
	}

	execute() {
		return Promise.resolve(this.applicationMetadata);
	}
};
