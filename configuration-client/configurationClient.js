import { HttpRequest, HttpRequestError, httpMethods } from "@tix-factory/http";
const SettingsCacheExpiry = 60 * 1000;
const schemeRegex = /^\w+:/;

export default class {
	constructor(httpClient, logger, defaultValues) {
		let configurationServiceHost = process.env.ConfigurationServiceHost;
		if (!schemeRegex.test(configurationServiceHost)) {
			configurationServiceHost = `https://${configurationServiceHost}`; 
		}

		this.httpClient = httpClient;
		this.logger = logger;
		this.defaultValues = {};
		this.configurationServiceHost = configurationServiceHost;
		this.cache = null;
		this.settingsExpiration = 0;

		if (defaultValues) {
			for (let settingName in defaultValues) {
				if (defaultValues.hasOwnProperty(settingName)) {
					this.defaultValues[settingName.toLowerCase()] = defaultValues[settingName];
				}
			}
		}
	}

	async getSettingValue(settingName) {
		const settings = await this.getApplicationSettings();
		return Promise.resolve(settings[settingName.toLowerCase()]);
	}

	setSettingValue(settingName, settingValue) {
		return this.sendPostRequest("v1/SetApplicationSettingValue", {
			settingName: settingName,
			settingValue: settingValue
		});
	}

	async getApplicationSettings() {
		const currentTime = +new Date;
		if (this.cache) {
			if (currentTime > this.settingsExpiration) {
				this.settingsExpiration = currentTime + SettingsCacheExpiry;

				this.loadApplicationSettings().then(settings => {
					this.cache = settings;
				}).catch(err => {
					this.logger.warn(`Failed to refresh application settings\n`, err);
				});
			}

			return Promise.resolve(this.cache);
		} else {
			const settings = await this.loadApplicationSettings();
			this.cache = settings;
			this.settingsExpiration = currentTime + SettingsCacheExpiry;

			return Promise.resolve(settings);
		}
	}

	async loadApplicationSettings() {
		try {
			const responseBody = await this.sendPostRequest("v1/GetApplicationSettings", {});
			const settings = Object.assign({}, this.defaultValues);

			for (let settingName in responseBody) {
				settings[settingName.toLowerCase()] = responseBody[settingName];
			}

			return Promise.resolve(settings);
		} catch (e) {
			return Promise.reject(e);
		}
	}

	async sendPostRequest(path, requestBody) {
		const httpRequest = new HttpRequest(httpMethods.post, new URL(`${this.configurationServiceHost}/${path}`));
		httpRequest.addOrUpdateHeader("Tix-Factory-Api-Key", process.env.ApplicationApiKey);
		httpRequest.addOrUpdateHeader("Content-Type", "application/json");
		httpRequest.body = Buffer.from(JSON.stringify(requestBody));

		const httpResponse = await this.httpClient.send(httpRequest);
		switch (httpResponse.statusCode) {
			case 200:
				const responseBody = JSON.parse(httpResponse.body.toString());
				return Promise.resolve(responseBody.data);
			case 201:
				return Promise.resolve();
			default:
				throw new HttpRequestError(httpRequest, httpResponse);
		}
	}
};
