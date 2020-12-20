import ConnectionPool from "./connectionPool.js";

export default class {
	constructor(configurationClient, logger, connectionStringSettingName, connectionPoolOptions) {
		this.connection = null;
		this.connectionError = null;
		this.configurationClient = configurationClient;
		this.logger = logger;
		this.connectionStringSettingName = connectionStringSettingName;
		this.connectionPoolOptions = connectionPoolOptions;
		this.connectionQueue = [];
		this.initConnection();
	}

	getConnection() {
		if (this.connection) {
			return Promise.resolve(this.connection);
		} else if (this.connectionError) {
			return Promise.reject(this.connectionError);
		} else {
			return new Promise((resolve, reject) => {
				this.connectionQueue.push({
					resolve: resolve,
					reject: reject
				});
			});
		}
	}

	initConnection() {
		this.configurationClient.getSettingValue(this.connectionStringSettingName).then(connectionString => {
			this.connection = new ConnectionPool(connectionString, this.connectionPoolOptions);

			this.connectionQueue.forEach(p => {
				try {
					p.resolve(this.connection);
				} catch (e) {
					this.logger.warn(e);
				}
			});

			this.connectionQueue = null;
		}).catch(err => {
			this.connectionError = err;

			this.connectionQueue.forEach(p => {
				try {
					p.reject(err);
				} catch (e) {
					this.logger.warn(e);
				}
			});

			this.connectionQueue = null;
		});
	}
}