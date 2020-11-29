import express from "express";
import http from "@tix-factory/http";
import Logger from "./logger.js";
import AuthorizationHandler from "./handlers/authorizationHandler.js";
import OperationRegistry from "./operationRegistry.js";
import FaviconOperation from "./operations/faviconOperation.js";
import ApplicationMetadataOperation from "./operations/applicationMetadataOperation.js";

export default class {
	constructor(options) {
		if (!options.port) {
			options.port = process.env.NODE_ENV === "production" ? 80 : 3000;
		}

		this.options = options;
		this.httpClient = new http.client(options.httpClientOptions || {
			requestTimeout: 10 * 1000
		});
		
		this.logger = new Logger(this.httpClient, process.env.LoggingServiceHost, options.logName);
		this.authorizationHandler = new AuthorizationHandler(this.httpClient, this.logger);
		this.app = express();
		this.operationRegistry = new OperationRegistry(this.registrOperation.bind(this));

		this.app.use(express.json());

		this.operationRegistry.registerOperation(new FaviconOperation(options.faviconFileName || "./favicon.ico"));
		this.operationRegistry.registerOperation(new ApplicationMetadataOperation(options.name));
	}

	registrOperation(operation) {
		switch (operation.method) {
			case http.methods.get:
			case http.methods.post:
			case http.methods.patch:
			case http.methods.put:
			case http.methods.delete:
			case http.methods.head:
			case http.methods.options:
				this.app[operation.method](operation.route, this.handleRequest.bind(this, operation));
				return;
			default:
				throw new Error(`Unrecognized operation method: "${operation.method}"\n\tOperation: "${operation.name}"`);
		}
	}

	async handleRequest(operation, request, response) {
		try {
			const apiKey = request.header("Tix-Factory-Api-Key");
			const isAuthorized = await this.authorizationHandler.isAuthorized(apiKey, operation);
			if (isAuthorized) {
				const result = await operation.execute(operation.method === http.methods.get ? request.params : request.body);
				if (result === undefined) {
					response.status(204);
				} else {
					response.status(200);

					if (operation.contentType) {
						response.set("Content-Type", operation.contentType);
					}

					if (operation.rawResult) {
						response.send(result);
					} else {
						response.send({
							data: result
						});
					}
				}
			} else {
				response.status(401);
				response.send({});
			}
		} catch (e) {
			if (typeof(e) === "string") {
				response.status(400);
				response.send({
					error: e
				});
			} else {
				response.status(500);
				response.send({});

				let message = `Unhandled exception in ${operation.name}`;
				message += `\n\tUrl: (${request.method}) ${request.hostname}${request.originalUrl}\n\n`;

				if (e instanceof Error) {
					message += e.stack || e.toString();
				} else if (typeof(e) === "object" || Array.isArray(e)) {
					message += JSON.stringify(e);
				} else {
					message += `${e}`;
				}

				this.logger.error(message);
			}
		} finally {
			response.end();
		}
	}

	notFoundHandler(request, response, next) {
		response.status(404).send({});
	}

	listen() {
		this.app.use(this.notFoundHandler.bind(this));

		this.app.listen(this.options.port, () => {
			this.logger.verbose(`${this.options.name} started\n\tPort: ${this.options.port}`);
		});
	}
}