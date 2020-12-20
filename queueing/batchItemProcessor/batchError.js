export default class extends Error {
	constructor(code, item, message) {
		super(message);

		this.code = code;
		this.item = item;
	}
};
