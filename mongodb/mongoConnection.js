import MongoDB from "mongodb";
import Collection from "./collection.js";
import IdGenerator from "./idGenerator.js";

export default class {
	constructor(connectionString, idGenerator) {
		this.connectionString = connectionString;
		this.idGenerator = idGenerator || new IdGenerator();

		this.client = new MongoDB.MongoClient(connectionString, {
			useUnifiedTopology: true,
			useNewUrlParser: true
		});

		this.databases = {};
	}

	async init() {
		await this.client.connect();
	}

	getDatabase(projectName) {
		let database = this.databases[projectName.toLowerCase()];
		if (database) {
			return database;
		}

		database = this.databases[projectName.toLowerCase()] = this.client.db(projectName);
		return database;
	}

	getCollection(projectName, collectionName, options) {
		const database = this.getDatabase(projectName);
		const collection = database.collection(collectionName);
		return new Collection(collection, this.idGenerator, options);
	}
};
