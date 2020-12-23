import idGenerator from "./idGenerator.js";

export default class {
	constructor(collection) {
		this.collection = collection;
	}

	createIndex(indexSpecification, options) {
		return new Promise((resolve, reject) => {
			this.collection.createIndex(indexSpecification, options, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			});
		});
	}

	count(filter) {
		return new Promise((resolve, reject) => {
			this.collection.count(filter, (err, count) => {
				if (err) {
					reject(err);
				} else {
					resolve(count);
				}
			});
		});
	}

	insert(row) {
		const id = idGenerator.generate();
		const currentTime = new Date();

		return new Promise((resolve, reject) => {
			this.collection.insertOne(Object.assign(row, {
				id: id,
				updated: currentTime,
				created: currentTime
			}), (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(id);
				}
			});
		});
	}

	findOneAndUpdate(query, updateFields) {
		return new Promise((resolve, reject) => {
			const currentTime = new Date();
			this.collection.findOneAndUpdate(query, {
				"$set": Object.assign(updateFields, {
					updated: currentTime
				})
			}, {
				// https://stackoverflow.com/a/35627439/1663648
				returnOriginal: false
			}, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result.value);
				}
			});
		});
	}

	updateOne(query, updateFields) {
		return new Promise((resolve, reject) => {
			const currentTime = new Date();
			this.collection.updateOne(query, {
				"$set": Object.assign(updateFields, {
					updated: currentTime
				})
			}, {
				writeConcern: "majority"
			}, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result.modifiedCount === 1);
				}
			});
		});
	}

	deleteOne(query) {
		return new Promise((resolve, reject) => {
			this.collection.deleteOne(query, {
				writeConcern: "majority"
			}, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result.deletedCount === 1);
				}
			});
		});
	}

	deleteMany(query) {
		return new Promise((resolve, reject) => {
			this.collection.deleteMany(query, {
				writeConcern: "majority"
			}, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result.deletedCount);
				}
			});
		});
	}
}