import { httpMethods } from "@tix-factory/http";

export default class {
	constructor(prometheusRegister) {
		this.prometheusRegister = prometheusRegister;
	}

	get allowAnonymous() {
		return false;
	}

	get name() {
		return "Metrics";
	}

	get route() {
		return "/metrics";
	}

	get method() {
		return httpMethods.get;
	}

	get contentType() {
		return this.prometheusRegister.contentType;
	}

	get rawResult() {
		return true;
	}

	execute() {
		const metricsBuffer = Buffer.from(this.prometheusRegister.metrics());
		this.prometheusRegister.resetMetrics();

		return Promise.resolve(metricsBuffer);
	}
};
