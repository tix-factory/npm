import { HttpRequest, HttpHandler, HttpRequestError, httpMethods } from "@tix-factory/http";
const GuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CacheExpiryInMilliseconds = 60 * 1000;
const schemeRegex = /^\w+:/;

export default class extends HttpHandler {
	constructor(httpClient, logger) {
		super();

		let applicationAuthorizationServiceHost = process.env.ApplicationAuthorizationServiceHost;
		if (!schemeRegex.test(applicationAuthorizationServiceHost)) {
			applicationAuthorizationServiceHost = `https://${applicationAuthorizationServiceHost}`; 
		}

		this.httpClient = httpClient;
		this.getAuthorizedOperationsEndpoint = new URL(`${applicationAuthorizationServiceHost}/v1/GetAuthorizedOperations`);
		this.logger = logger;
		this.cache = {};
	}

	isAuthorized(apiKey, operation) {
		if (operation.allowAnonymous) {
			return Promise.resolve(true);
		}

		return new Promise(async (resolve, reject) => {
			try {
				const authorizedOperations = await this.getAuthorizedOperations(apiKey);
				resolve(authorizedOperations.includes(operation.name.toLowerCase()));
			} catch (e) {
				this.logger.error(`Failed to load application authorizations for ApiKey.\n`, e);
				resolve(false);
			}
		});
	}

	getAuthorizedOperations(apiKey) {
		if (!apiKey || !GuidRegex.test(apiKey)) {
			return Promise.resolve([]);
		}

		const currentTime = +new Date;
		let cachedAuthorizations = this.cache[apiKey];
		if (cachedAuthorizations) {
			cachedAuthorizations.accessExpiry = currentTime + (CacheExpiryInMilliseconds * 2);
			if (cachedAuthorizations.refreshExpiry < currentTime) {
				cachedAuthorizations.refreshExpiry = currentTime + CacheExpiryInMilliseconds;
				setTimeout(() => this.refreshAuthorizedOperations(apiKey), 0);
			}

			return Promise.resolve(cachedAuthorizations.operations);
		}

		return this.loadAuthorizationedOperations(apiKey);
	}

	refreshAuthorizedOperations(apiKey) {
		this.loadAuthorizationedOperations(apiKey).then(() => {
			// Loading the authorizations also cached them.
		}).catch(err => {
			this.logger.warn(`Failed to refresh application authorizations for ApiKey.\n`, err);
		});
	}

	loadAuthorizationedOperations(apiKey) {
		return new Promise(async (resolve, reject) => {
			try {
				const httpRequest = new HttpRequest(httpMethods.post, this.getAuthorizedOperationsEndpoint);
				httpRequest.addOrUpdateHeader("Tix-Factory-Api-Key", process.env.ApplicationApiKey);
				httpRequest.addOrUpdateHeader("Content-Type", "application/json");
				httpRequest.body = Buffer.from(JSON.stringify({
					apiKey: apiKey
				}));

				const httpResponse = await this.httpClient.send(httpRequest);
				if (httpResponse.statusCode === 200) {
					const responseBody = JSON.parse(httpResponse.body.toString());
					const authorizedOperations = responseBody.data.map(o => o.toLowerCase());
					
					this.cacheAuthorizations(apiKey, authorizedOperations);

					resolve(authorizedOperations);
					return;
				} else {
					reject(new HttpRequestError(httpRequest, httpResponse));
				}
			} catch (e) {
				reject(e);
			}
		});
	}

	cacheAuthorizations(apiKey, authorizedOperations) {
		let currentTime = +new Date;
		this.cache[apiKey] = {
			accessExpiry: currentTime + (CacheExpiryInMilliseconds * 2),
			refreshExpiry: currentTime + CacheExpiryInMilliseconds,
			operations: authorizedOperations
		};

		setTimeout(() => {
			const cachedAuthorizations = this.cache[apiKey];
			let currentTime = +new Date;

			if (cachedAuthorizations && cachedAuthorizations.accessExpiry < currentTime) {
				delete this.cache[apiKey];
			}
		}, CacheExpiryInMilliseconds * 3);
	}
}