import http from "@tix-factory/http";
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
		this.getApplicationSettingsEndpoint = new URL(`${configurationServiceHost}/v1/GetApplicationSettings`);
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

	getSettingValue(settingName) {
		return new Promise((resolve, reject) => {
			this.getApplicationSettings().then(settings => {
				resolve(settings[settingName.toLowerCase()]);
			}).catch(reject);
		});
	}

	getApplicationSettings() {
		return new Promise((resolve, reject) => {
			const currentTime = +new Date;
			if (this.cache) {
				if (currentTime > this.settingsExpiration) {
					this.settingsExpiration = currentTime + SettingsCacheExpiry;
					this.loadApplicationSettings().then(settings => {
						this.cache = settings;
					}).catch(err => {
						let errorStack;
						if (err instanceof Error) {
							errorStack = err.stack;
						} else {
							errorStack = JSON.stringify(err);
						}

						this.logger.warn(`Failed to refresh application settings\n${errorStack}`);
					});
				}

				resolve(this.cache);
			} else {
				this.loadApplicationSettings().then(settings => {
					this.cache = settings;
					this.settingsExpiration = currentTime + SettingsCacheExpiry;
					resolve(settings);
				}).catch(reject);
			}
		});
	}

	loadApplicationSettings() {
		return new Promise((resolve, reject) => {
			const httpRequest = new http.request(http.methods.post, this.getApplicationSettingsEndpoint);
			httpRequest.addOrUpdateHeader("Tix-Factory-Api-Key", process.env.ApplicationApiKey);
			httpRequest.addOrUpdateHeader("Content-Type", "application/json");
			httpRequest.body = Buffer.from("{}");

			this.httpClient.send(httpRequest).then(httpResponse => {
				if (httpResponse.statusCode === 200) {
					const responseBody = JSON.parse(httpResponse.body.toString());
					const settings = Object.assign({}, this.defaultValues);

					for (let settingName in responseBody.data) {
						settings[settingName.toLowerCase()] = responseBody.data[settingName];
					}

					resolve(settings);
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
};
