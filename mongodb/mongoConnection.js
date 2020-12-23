import MongoDB from "mongodb";
import Collection from "./collection.js";

const connect = (connectionString) => {
	return new Promise((resolve, reject) => {
		MongoDB.MongoClient.connect(connectionString, (err, connection) => {
			if (err) {
				reject(err);
			} else {
				resolve(connection);
			}
		});
	});
};

export default class {
	constructor(connectionString) {
		this.connectionString = connectionString;
		this.connection = null;
		this.databases = {};
	}

	async connect(projectName) {
		try {
			let database = this.databases[projectName.toLowerCase()];
			if (database) {
				return Promise.resolve(database);
			}

			let connection = this.connection;
			if (!connection) {
				this.connection = connection = await connect(this.connectionString);
			}

			this.databases[projectName.toLowerCase()] = database = connection.db(projectName);
			return Promise.resolve(database);
		} catch (e) {
			return Promise.reject(e);
		}
	}

	async getCollection(projectName, collectionName) {
		try {
			const database = await this.connect(projectName);
			const collection = new Collection(database.collection(collectionName));

			await collection.createIndex({
				"id": 1
			}, {
				unique: true
			});

			return Promise.resolve(collection);
		} catch (e) {
			return Promise.reject(e);
		}
	}
};
