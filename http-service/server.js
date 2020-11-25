import http from "@tix-factory/http";
import Logger from "./logger.js";
import AuthorizationHandler from "./handlers/authorizationHandler.js";
import OperationSelectionHandler from "./handlers/operationSelectionHandler.js";
import OperationExecutionHandler from "./handlers/operationExecutionHandler.js";
import FaviconOperation from "./operations/faviconOperation.js";
import ApplicationMetadataOperation from "./operations/applicationMetadataOperation.js";

const buildHandlers = (httpClient, logger, operationRegistry, options) => {
	const handlers = [
		new OperationSelectionHandler(operationRegistry)
	];

	if (options.authorizationHandler) {
		handlers.push(options.authorizationHandler);
	} else {
		handlers.push(new AuthorizationHandler(httpClient, logger));
	}

	const operationExecutionHandler = new OperationExecutionHandler();

	for (let i = 0; i < handlers.length; i++) {
		let handler = handlers[i];

		if (i + 1 === handlers.length) {
			handler.setNextHandler(operationExecutionHandler);
		} else {
			handler.setNextHandler(handlers[i + 1]);
		}
	}

	return handlers;
};

const registryDefaultOperations = (operationRegistry, options) => {
	const applicationMetadataOperation = new ApplicationMetadataOperation(options.name);
	operationRegistry.registerOperation(applicationMetadataOperation);

	const faviconOperation = new FaviconOperation(options.faviconFileName || "./favicon.ico");
	operationRegistry.registerOperation(faviconOperation);
};

export default class {
	constructor(httpClient, operationRegistry, options) {
		this.httpClient = httpClient;
		this.logger = new Logger(this.httpClient, process.env.LoggingServiceHost, options.logName);
		this.operationRegistry = operationRegistry;

		this.logger.verbose(`Starting ${options.name}...`);

		this.handlers = buildHandlers(httpClient, this.logger, operationRegistry, options);

		this.server = new http.server({
			errorHandler: this.error.bind(this)
		}, this.processRequestQueue.bind(this));

		registryDefaultOperations(operationRegistry, options);
	}

	processRequestQueue(httpRequest) {
		return new Promise(async (resolve, reject) => {
			try {
				const httpResponse = await this.handlers[0].execute(httpRequest);
				resolve(httpResponse);
			} catch (e) {
				this.error(e);

				const internalServerError = new http.response(500);
				internalServerError.addOrUpdateHeader("Content-Type", "application/json");
				internalServerError.body = Buffer.from("{}");

				resolve(internalServerError);
			}
		});
	}

	error(err) {
		this.logger.error(err);
	}
}