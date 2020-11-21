import http from "@tix-factory/http";

export default class extends http.handler {
	constructor(operationRegistry) {
		super();

		this.operationRegistry = operationRegistry;
	}

	execute(httpRequest) {
		return new Promise((resolve, reject) => {
			const operation = this.operationRegistry.getByRoute(httpRequest.url.pathname);
			if (!operation) {
				const notFoundResponse = new http.response(404);
				notFoundResponse.addOrUpdateHeader("Content-Type", "application/json");
				notFoundResponse.body = Buffer.from("{}");
	
				resolve(notFoundResponse);
				return;
			}

			if (operation.method ? operation.method !== httpRequest.method : httpRequest.method !== http.methods.post) {
				const methodNotAllowedResponse = new http.response(405);
				methodNotAllowedResponse.addOrUpdateHeader("Content-Type", "application/json");
				methodNotAllowedResponse.body = Buffer.from("{}");
	
				resolve(methodNotAllowedResponse);
				return;
			}

			httpRequest.operation = operation;
			super.execute(httpRequest).then(resolve).catch(reject);
		});
	}
}