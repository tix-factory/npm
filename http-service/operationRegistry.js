export default class {
	constructor(operationsArray) {
		this.operations = [];
		this.operationsByRoute = {};

		operationsArray.forEach(this.registerOperation.bind(this));
	}

	registerOperation(operation) {
		this.operationsByRoute[operation.route.toLowerCase()] = operation;
	}

	getByRoute(pathname) {
		return this.operationsByRoute[pathname.toLowerCase()];
	}
}