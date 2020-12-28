import { httpMethods } from "@tix-factory/http";

export default class {
	constructor(registrationHandler) {
		this.operations = [];
		this.operationsByRoute = {};
		this.registrationHandler = registrationHandler;
	}

	registerOperation(operation) {
		if (!operation.method) {
			operation.method = httpMethods.post;
		}

		if (typeof(operation.allowAnonymous) !== "boolean") {
			operation.allowAnonymous = false;
		}

		if (typeof(operation.route) !== "string") {
			operation.route = `/v1/${operation.name}`;
		}

		this.operations.push(operation);
		this.operationsByRoute[operation.route.toLowerCase()] = operation;
		this.registrationHandler(operation);
	}

	getByRoute(pathname) {
		return this.operationsByRoute[pathname.toLowerCase()];
	}
}