export default class extends Error {
	constructor(code, message, innerError) {
		super(message);

		this.code = code;
		this.innerError = innerError;
	}
}