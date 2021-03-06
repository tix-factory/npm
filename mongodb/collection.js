export default class {
	constructor(collection, idGenerator, options) {
		if (!options) {
			options = {};
		}

		if (!options.hasOwnProperty("collation")) {
			options.collation = {
				locale: "en_US",
				strength: 2
			};
		}

		this.collection = collection;
		this.idGenerator = idGenerator;
		this.options = options;
	}

	createIndex(indexSpecification, options) {
		return new Promise((resolve, reject) => {
			options = this.validateOptions(options);

			this.collection.createIndex(indexSpecification, options, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			});
		});
	}

	count(query, options) {
		return new Promise((resolve, reject) => {
			query = this.validateQuery(query);
			options = this.validateOptions(options);

			this.collection.count(query, options, (err, count) => {
				if (err) {
					reject(err);
				} else {
					resolve(count);
				}
			});
		});
	}

	insert(row) {
		const id = this.idGenerator.generate();
		const currentTime = new Date();

		return new Promise((resolve, reject) => {
			// To make sure id is always at the front... right?
			this.collection.insertOne(Object.assign({
				_id: id,
			}, row, {
				_id: id,
				created: currentTime,
				updated: currentTime
			}), (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(id);
				}
			});
		});
	}

	find(query, options) {
		return new Promise((resolve, reject) => {
			query = this.validateQuery(query);
			options = this.validateOptions(options);

			this.collection.find(query, (err, cursor) => {
				if (err) {
					reject(err);
				} else {
					if (options.hasOwnProperty("limit")) {
						if (options.limit < 1) {
							resolve([]);
							return;
						}

						cursor.limit(options.limit);
					}

					if (options.skip && options.skip > 0) {
						cursor.skip(options.skip);
					}

					if (options.sort) {
						cursor.sort(options.sort);
					}

					if (options.collation) {
						cursor.collation(options.collation);
					}

					cursor.toArray().then(documents => {
						documents.forEach(e => {
							e.id = e._id;
						});

						resolve(documents);
					}).catch(reject);
				}
			});
		});
	}

	findOne(query, options) {
		return new Promise((resolve, reject) => {
			query = this.validateQuery(query);
			options = this.validateOptions(options);

			this.collection.findOne(query, options, (err, result) => {
				if (err) {
					reject(err);
				} else {
					if (result) {
						result.id = result._id;
					}

					resolve(result);
				}
			});
		});
	}

	findOneAndUpdate(query, updateFields, options) {
		return new Promise((resolve, reject) => {
			query = this.validateQuery(query);
			options = this.validateOptions(options);

			// https://stackoverflow.com/a/35627439/1663648
			options.returnOriginal = false;

			const currentTime = new Date();
			this.collection.findOneAndUpdate(query, {
				"$set": Object.assign(updateFields, {
					updated: currentTime
				})
			}, options, (err, result) => {
				if (err) {
					reject(err);
				} else {
					if (result.value) {
						result.value.id = result.value._id;
					}

					resolve(result.value);
				}
			});
		});
	}

	updateOne(query, updateFields, options) {
		return new Promise((resolve, reject) => {
			query = this.validateQuery(query);
			options = this.validateOptions(options);
			options.writeConcern = "majority";

			const currentTime = new Date();
			this.collection.updateOne(query, {
				"$set": Object.assign(updateFields, {
					updated: currentTime
				})
			}, options, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result.modifiedCount === 1);
				}
			});
		});
	}

	deleteOne(query, options) {
		return new Promise((resolve, reject) => {
			query = this.validateQuery(query);
			options = this.validateOptions(options);
			options.writeConcern = "majority";

			this.collection.deleteOne(query, options, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result.deletedCount === 1);
				}
			});
		});
	}

	deleteMany(query, options) {
		return new Promise((resolve, reject) => {
			query = this.validateQuery(query);
			options = this.validateOptions(options);
			options.writeConcern = "majority";

			this.collection.deleteMany(query, options, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result.deletedCount);
				}
			});
		});
	}

	validateQuery(query) {
		if (!query) {
			query = {};
		}

		if (query.hasOwnProperty("id")) {
			query._id = query.id;
			delete query.id;
		}

		return query;
	}

	validateOptions(options) {
		if (!options) {
			options = {};
		}

		if (this.options.collation && !options.hasOwnProperty("collation")) {
			options.collation = this.options.collation;
		} else if (!options.collation) {
			delete options.collation;
		}

		return options;
	}
}