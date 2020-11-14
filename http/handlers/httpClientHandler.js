export default class {
	constructor() {
		this._nextHandler = null;
	}

	execute(httpRequest) {
		return new Promise(async (resolve, reject) => {
			try {
				const httpResponse = await this._nextHandler(httpRequest);
				resolve(httpResponse);
			} catch (e) {
				reject(e);
			}
		});
	}

	setNextHandler(nextHandler) {
		this._nextHandler = nextHandler;
	}
};
