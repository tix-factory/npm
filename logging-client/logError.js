import { HttpRequestError } from "@tix-factory/http";

export default class extends HttpRequestError {
	constructor(httpRequest, httpResponse, logData) {
		super(httpRequest, httpResponse);

		this.logData = logData;
	}
};
