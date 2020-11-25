export default class {
	constructor(registrationHandler) {
		this.operations = [];
		this.operationsByRoute = {};
		this.registrationHandler = registrationHandler;
	}

	registerOperation(operation) {
		this.operations.push(operation);
		this.operationsByRoute[operation.route.toLowerCase()] = operation;
		this.registrationHandler(operation);
	}

	getByRoute(pathname) {
		return this.operationsByRoute[pathname.toLowerCase()];
	}
}