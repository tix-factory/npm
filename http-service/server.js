import express from "express";
import promClient from "prom-client";
import { HttpClient, httpMethods } from "@tix-factory/http";
import { Logger } from "@tix-factory/logging-client";
import AuthorizationHandler from "./handlers/authorizationHandler.js";
import OperationRegistry from "./operationRegistry.js";
import FaviconOperation from "./operations/faviconOperation.js";
import ApplicationMetadataOperation from "./operations/applicationMetadataOperation.js";
import MetricsOperation from "./operations/metricsOperation.js";

export default class {
	constructor(options) {
		if (!options.port) {
			options.port = process.env.NODE_ENV === "production" ? 80 : 3000;
		}

		this.options = options;
		this.httpClient = new HttpClient(options.httpClientOptions || {
			requestTimeout: 10 * 1000
		});
		
		this.logger = new Logger(this.httpClient, options.logName);
		this.promClient = promClient;
		this.authorizationHandler = new AuthorizationHandler(this.httpClient, this.logger);
		this.app = express();
		this.operationRegistry = new OperationRegistry(this.registerOperation.bind(this));

		this.app.use(express.json());

		this.operationRegistry.registerOperation(new FaviconOperation(options.faviconFileName || "./favicon.ico"));
		this.operationRegistry.registerOperation(new ApplicationMetadataOperation(options.name));

		this.registerMetrics();
	}

	registerMetrics() {
		this.counters = {
			executionTime: new promClient.Gauge({
				name: "operation_execution_time",
				help: "Operation execution time in seconds.",
				labelNames: ["operationName"]
			}),
			executionCount: new promClient.Counter({
				name: "operation_execution_count",
				help: "Operation executions per collection interval.",
				labelNames: ["operationName", "statusCode"]
			})
		};

		promClient.register.setDefaultLabels({
			applicationName: this.options.name
		});

		this.operationRegistry.registerOperation(new MetricsOperation(promClient.register));
	}

	registerOperation(operation) {
		switch (operation.method) {
			case httpMethods.get:
			case httpMethods.post:
			case httpMethods.patch:
			case httpMethods.put:
			case httpMethods.delete:
			case httpMethods.head:
			case httpMethods.options:
				this.app[operation.method](operation.route, this.handleRequest.bind(this, operation));
				return;
			default:
				throw new Error(`Unrecognized operation method: "${operation.method}"\n\tOperation: "${operation.name}"`);
		}
	}

	async handleRequest(operation, request, response) {
		let statusCode = 0;

		const endRequestDuration = this.counters.executionTime.startTimer({
			operationName: operation.name
		});

		try {
			const apiKey = this.getApiKey(request);
			const isAuthorized = await this.authorizationHandler.isAuthorized(apiKey, operation);
			if (isAuthorized) {
				const result = await operation.execute(operation.method === httpMethods.get ? request.params : request.body);
				if (result === undefined) {
					response.status(statusCode = 204);
				} else {
					response.status(statusCode = 200);

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
				response.status(statusCode = 401);
				response.send({});
			}
		} catch (e) {
			if (typeof(e) === "string") {
				response.status(statusCode = 400);
				response.send({
					error: e
				});
			} else {
				response.status(statusCode = 500);
				response.send({});

				let message = `Unhandled exception in ${operation.name}`;
				message += `\n\tUrl: (${request.method}) ${request.hostname}${request.originalUrl}\n\n`;

				this.logger.error(message, e);
			}
		} finally {
			response.end();
		}

		try {
			endRequestDuration();
			this.counters.executionCount.inc({
				operationName: operation.name,
				statusCode: statusCode
			});
		}catch (e) {
			this.logger.warn("failed to record request metrics", e);
		}
	}

	notFoundHandler(request, response, next) {
		response.status(404).send({});

		try {
			this.counters.executionCount.inc({
				statusCode: 404
			});
		}catch (e) {
			this.logger.warn("failed to record 404", e);
		}
	}

	listen() {
		this.app.use(this.notFoundHandler.bind(this));

		this.app.listen(this.options.port, () => {
			this.logger.verbose(`${this.options.name} started\n\tPort: ${this.options.port}`);
		});
	}

	getApiKey(request) {
		let apiKey = request.header("Tix-Factory-Api-Key");
		if (apiKey) {
			return apiKey;
		}

		let authorization = request.header("Authorization");
		if (authorization) {
			let authorizationSplit = authorization.split(" ");
			if (authorizationSplit.length === 2
				&& authorizationSplit[0] === "Bearer") {
				try {
					const buffer = Buffer.from(authorizationSplit[1], 'base64');
					return buffer.toString();
				} catch {
					// Could not base64 decode the header.
				}
			}
		}
	}
}