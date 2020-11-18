import http from "@tix-factory/http";
import queueing from "@tix-factory/queueing";
import Logger from "./logger.js";
import FaviconOperation from "./operations/faviconOperation.js";
import ApplicationMetadataOperation from "./operations/applicationMetadataOperation.js";

export default class {
	constructor(httpClient, operationRegistry, options) {
		this.httpClient = httpClient;
		this.logger = new Logger(this.httpClient, process.env.LoggingServiceHost, options.logName);
		this.operationRegistry = operationRegistry;

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
				const httpResponse = await this.processRequest(request.data);
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

	processRequest(request) {
		return new Promise(async (resolve, reject) => {
			try {
				const operation = this.operationRegistry.getByRoute(request.url.pathname);
				if (!operation) {
					const notFoundResponse = new http.response(404);
					notFoundResponse.addOrUpdateHeader("Content-Type", "application/json");
					notFoundResponse.body = Buffer.from("{}");
		
					resolve(notFoundResponse);
					return;
				}

				if (operation.method ? operation.method !== request.method : request.method !== http.methods.post) {
					const methodNotAllowedResponse = new http.response(405);
					methodNotAllowedResponse.addOrUpdateHeader("Content-Type", "application/json");
					methodNotAllowedResponse.body = Buffer.from("{}");
		
					resolve(methodNotAllowedResponse);
					return;
				}

				const authorized = await this.authorizeOperation(request, operation);
				if (!authorized) {
					const unauthorizedResponse = new http.response(401);
					unauthorizedResponse.addOrUpdateHeader("Content-Type", "application/json");
					unauthorizedResponse.body = Buffer.from("{}");
		
					resolve(unauthorizedResponse);
					return;
				}

				let requestBody = null;
				if (request.body && request.body.length > 0) {
					requestBody = JSON.parse(request.body.toString());
				}
				
				operation.execute(requestBody).then((data) => {
					if (!data) {
						const noContentResponse = new http.response(204);
						resolve(noContentResponse);
						return;
					}

					if (operation.name === "favicon") {
						resolve(data);
						return;
					}

					let responseBody = {
						data: data
					};

					if (operation.name === "ApplicationMetadata") {
						responseBody = data;
					}

					const successResponse = new http.response(200);
					successResponse.addOrUpdateHeader("Content-Type", "application/json");
					successResponse.body = Buffer.from(JSON.stringify(responseBody));

					resolve(successResponse);
				}).catch(err => {
					if (typeof(err) === "string") {
						const errorResponse = new http.response(400);
						errorResponse.addOrUpdateHeader("Content-Type", "application/json");
						errorResponse.body = Buffer.from(JSON.stringify({
							error: err
						}));

						resolve(errorResponse);
					} else {
						reject(err);
					}
				});
			} catch(e) {
				reject(e);
			}
		});
	}

	authorizeOperation(request, operation) {
		return new Promise((resolve, reject) => {
			if (operation.allowAnonymous) {
				resolve(true);
				return;
			}

			// TODO: Read authorizations
			resolve(false);
		});
	}

	error(err) {
		this.logger.error(err);
	}
}