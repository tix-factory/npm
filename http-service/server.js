import http from "@tix-factory/http";
import queueing from "@tix-factory/queueing";
import Logger from "./logger.js";
import AuthorizationHandler from "./handlers/authorizationHandler.js";
import OperationSelectionHandler from "./handlers/operationSelectionHandler.js";
import OperationExecutionHandler from "./handlers/operationExecutionHandler.js";
import FaviconOperation from "./operations/faviconOperation.js";
import ApplicationMetadataOperation from "./operations/applicationMetadataOperation.js";

export default class {
	constructor(httpClient, operationRegistry, options) {
		this.httpClient = httpClient;
		this.logger = new Logger(this.httpClient, process.env.LoggingServiceHost, options.logName);
		this.operationRegistry = operationRegistry;

		this.handlers = [
			new OperationSelectionHandler(operationRegistry),
			new AuthorizationHandler(httpClient),
			new OperationExecutionHandler()
		];

		this.server = new http.server({
			errorHandler: this.error.bind(this)
		});

		this.requestQueueProcessor = new queueing.QueueProcessor({
			numberOfThreads: options.numberOfThreads || 512
		}, this.server.requestQueue, this.processRequestQueue.bind(this));

		const applicationMetadataOperation = new ApplicationMetadataOperation(options.name);
		operationRegistry.registerOperation(applicationMetadataOperation);

		const faviconOperation = new FaviconOperation(options.faviconFileName || "./favicon.ico");
		operationRegistry.registerOperation(faviconOperation);

		this.logger.verbose(`Starting ${options.name}...`);
	}

	processRequestQueue(request) {
		return new Promise(async (resolve, reject) => {
			try {
				const httpResponse = await this.handlers[0].execute(request.data);
				request.resolve(httpResponse);
			} catch (e) {
				this.error(e);

				const internalServerError = new http.response(500);
				internalServerError.addOrUpdateHeader("Content-Type", "application/json");
				internalServerError.body = Buffer.from("{}");

				request.resolve(internalServerError);
			} finally {
				resolve(true);
			}
		});
	}

	error(err) {
		this.logger.error(err);
	}
}