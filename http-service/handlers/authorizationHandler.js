import http from "@tix-factory/http";
import lockAsync from "../lockAsync.js";
const GuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CacheExpiryInMilliseconds = 60 * 1000;

export default class extends http.handler {
	constructor(httpClient, logger) {
		super();

		this.httpClient = httpClient;
		this.logger = logger;
		this.cache = {};
	}

	execute(httpRequest) {
		return new Promise((resolve, reject) => {
			this.authorizeOperation(httpRequest).then(authorized => {
				if (!authorized) {
					const unauthorizedResponse = new http.response(401);
					unauthorizedResponse.addOrUpdateHeader("Content-Type", "application/json");
					unauthorizedResponse.body = Buffer.from("{}");
		
					resolve(unauthorizedResponse);
					return;
				}

				super.execute(httpRequest).then(resolve).catch(reject);
			}).catch(reject);
		});
	}

	authorizeOperation(httpRequest) {
		return new Promise((resolve, reject) => {
			if (httpRequest.operation.allowAnonymous) {
				resolve(true);
				return;
			}

			const apiKey = httpRequest.getHeader("Tix-Factory-Api-Key");
			this.getAuthorizedOperations(apiKey).then(authorizedOperations => {
				resolve(authorizedOperations.includes(httpRequest.operation.name.toLowerCase()));
			}).catch(err => {
				let errorStack;
				if (err instanceof Error) {
					errorStack = err.stack;
				} else {
					errorStack = JSON.stringify(err);
				}

				this.logger.error(`Failed to load application authorizations for ApiKey.\n${errorStack}`);
				resolve(false);
			});
		});
	}

	getAuthorizedOperations(apiKey) {
		return new Promise((resolve, reject) => {
			if (!apiKey || !GuidRegex.test(apiKey)) {
				resolve([]);
				return;
			}

			lockAsync(`AuthorizationHandler:${apiKey}`, (releaseLock) => {
				const currentTime = +new Date;
				let cachedAuthorizations = this.cache[apiKey];
				
				if (cachedAuthorizations) {
					cachedAuthorizations.accessExpiry = currentTime + CacheExpiryInMilliseconds;
					if (cachedAuthorizations.refreshExpiry < currentTime) {
						cachedAuthorizations.refreshExpiry = currentTime + (CacheExpiryInMilliseconds * 2);
						setTimeout(() => this.refreshAuthorizedOperations(apiKey), 0);
					}

					releaseLock();
					resolve(cachedAuthorizations.operations);
				} else {
					this.loadAuthorizationedOperations(apiKey).then(authorizedOperations => {
						this.cache[apiKey] = cachedAuthorizations = {
							accessExpiry: currentTime + CacheExpiryInMilliseconds,
							refreshExpiry: currentTime + (CacheExpiryInMilliseconds * 2),
							operations: authorizedOperations
						};
						
						resolve(authorizedOperations);
					}).catch(reject).finally(() => {
						releaseLock();
					});
				}
			});
		});
	}

	refreshAuthorizedOperations(apiKey) {
		this.loadAuthorizationedOperations(apiKey).then(authorizedOperations => {
			this.cache[apiKey] = {
				accessExpiry: currentTime + CacheExpiryInMilliseconds,
				refreshExpiry: currentTime + (CacheExpiryInMilliseconds * 2),
				operations: authorizedOperations
			};
		}).catch(err => {
			let errorStack;
			if (err instanceof Error) {
				errorStack = err.stack;
			} else {
				errorStack = JSON.stringify(err);
			}

			this.logger.warn(`Failed to refresh application authorizations for ApiKey.\n${errorStack}`);
		});
	}

	loadAuthorizationedOperations(apiKey) {
		return new Promise((resolve, reject) => {
			const httpRequest = new http.request(http.methods.post, new URL(`http://${process.env.ApplicationAuthorizationServiceHost}/v1/GetAuthorizedOperations`));
			httpRequest.addOrUpdateHeader("Tix-Factory-Api-Key", process.env.ApplicationApiKey);
			httpRequest.addOrUpdateHeader("Content-Type", "application/json");
			httpRequest.body = Buffer.from(JSON.stringify({
				apiKey: apiKey
			}));

			this.httpClient.send(httpRequest).then(httpResponse => {
				if (httpResponse.statusCode === 200) {
					const responseBody = JSON.parse(httpResponse.body.toString());
					resolve(responseBody.data.map(o => o.toLowerCase()));
					return;
				} else {
					reject({
						data: httpResponse.statusCode,
						code: "Unknown"
					});
				}
			}).catch(reject);
		});
	}
}