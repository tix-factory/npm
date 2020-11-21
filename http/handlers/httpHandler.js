export default class {
	constructor() {
		this._nextHandler = null;
	}

	execute(httpRequest) {
		return this._nextHandler.execute(httpRequest);
	}

	setNextHandler(nextHandler) {
		this._nextHandler = nextHandler;
	}
};
