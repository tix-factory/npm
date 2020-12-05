import mysql from "mysql";
import fs from "fs";
import mySqlErrors from "./mySqlErrors.js";
import MySqlError from "./mySqlError.js";
const StoredProcedureNameValidationRegex = /^\w+$/;

const parseConnectionString = (connectionString, options) => {
	const connectionStringValues = {};
	connectionString.split(";").forEach(part => {
		let parts = part.split("=");
		if (parts.length === 2) {
			connectionStringValues[parts[0].toLowerCase()] = parts[1];
		}
	});

	const configuration = {
		user: connectionStringValues.user,
		password: connectionStringValues.password,
		host: connectionStringValues.server,
		port: connectionStringValues.port,
		timezone: "Z",
		connectionLimit: options.maxConnections || 10
	};

	if (connectionStringValues.hasOwnProperty("database")) {
		configuration.database = connectionStringValues.database;
	}

	if (connectionStringValues.hasOwnProperty("sslmode") && connectionStringValues.sslmode.toLowerCase() === "required") {
		configuration.ssl = {
			ca: fs.readFileSync(options.sslCertificateFileName)
		};
	}

	return configuration;
};

const verifyParameterType = (parameterValue, expectedParameterType) => {
	switch(typeof(parameterValue)) {
		// TODO: More expectedParameterType validation
		case "string":
		case "boolean":
		case "number":
			return true;
		case "object":
			if (parameterValue instanceof Date) {
				return expectedParameterType === "datetime";
			}

			return false;
	}
};

const getStoredProcedureQuery = (storedProcedureName, parameterValuesArray) => {
	const callParameters = parameterValuesArray.map(p => "?");
	return `CALL \`${storedProcedureName}\`(${callParameters.join(", ")})`;
};

export default class {
	constructor(connectionString, options) {
		if (!options) {
			options = {};
		}

		const poolConfiguration = parseConnectionString(connectionString, options);
		this.connectionPool = mysql.createPool(poolConfiguration);
		this.options = options;
		this.storedProcedureParameterCache = {};
	}

	executeInsertStoredProcedure(storedProcedureName, parameters) {
		return new Promise((resolve, reject) => {
			this.executeReadStoredProcedure(storedProcedureName, parameters).then((rows) => {
				resolve(rows[0].ID);
			}).catch(reject);
		});
	}

	executeCountStoredProcedure(storedProcedureName, parameters) {
		return new Promise((resolve, reject) => {
			this.executeReadStoredProcedure(storedProcedureName, parameters).then((rows) => {
				resolve(rows[0].Count);
			}).catch(reject);
		});
	}

	executeReadStoredProcedure(storedProcedureName, parameters) {
		return new Promise((resolve, reject) => {
			this.translateInputParameters(storedProcedureName, parameters).then((parameterValuesArray) => {
				const query = getStoredProcedureQuery(storedProcedureName, parameterValuesArray);
				this.connectionPool.query(query, parameterValuesArray, (err, results) => {
					if (err) {
						reject(err);
					} else {
						resolve(results[0]);
					}
				});
			}).catch(reject);
		});
	}

	executeWriteStoredProcedure(storedProcedureName, parameters) {
		return new Promise((resolve, reject) => {
			this.translateInputParameters(storedProcedureName, parameters).then((parameterValuesArray) => {
				const query = getStoredProcedureQuery(storedProcedureName, parameterValuesArray);
				this.connectionPool.query(query, parameterValuesArray, (err, results) => {
					if (err) {
						reject(err);
					} else {
						resolve(results.affectedRows);
					}
				});
			}).catch(reject);
		});
	}

	translateInputParameters(storedProcedureName, parameters) {
		const parameterValues = {};
		for (let parameterName in parameters) {
			if (parameters.hasOwnProperty(parameterName)) {
				parameterValues[parameterName.toLowerCase()] = parameters[parameterName];
			}
		}

		return new Promise((resolve, reject) => {
			this.getStoredProcedureParameters(storedProcedureName).then(storedProcedureParameters => {
				const parameterValuesArray = [];

				for (let i = 0; i < storedProcedureParameters.input.length; i++) {
					let parameter = storedProcedureParameters.input[i];
					let parameterName = parameter.name.toLowerCase();

					if (!parameterValues.hasOwnProperty(parameterName)) {
						reject(new MySqlError(mySqlErrors.missingParameter, `Missing stored procedure parameter\n\tParameter: ${parameter.name} (${parameter.type})\n\tStored Procedure: ${storedProcedureName}`));
						return;
					}

					let parameterValue = parameterValues[parameterName];
					if (!verifyParameterType(parameterValue, parameter.type)) {
						reject(new MySqlError(mySqlErrors.invalidParameterType, `Invalid paramter type\n\tParameter: ${parameter.name} (expected ${parameter.type}, got ${typeof(parameterValue)})\n\tStored Procedure: ${storedProcedureName}`));
						return;
					}

					parameterValuesArray.push(parameterValues[parameterName]);
				}

				resolve(parameterValuesArray);
			}).catch(reject);
		});
	}

	getStoredProcedureParameters(storedProcedureName) {
		let storedProcedureParameters = this.storedProcedureParameterCache[storedProcedureName];
		if (storedProcedureParameters) {
			return Promise.resolve(storedProcedureParameters);
		}

		return new Promise((resolve, reject) => {
			if (!StoredProcedureNameValidationRegex.test(storedProcedureName)) {
				reject(new MySqlError(mySqlErrors.invalidStoredProcedureName, `Invalid stored procedure name\n\tStored Procedure: ${storedProcedureName}`));
				return;
			}

			this.connectionPool.query("CALL `GetStoredProcedureParameters`(?)", [storedProcedureName], (err, results) => {
				if (err) {
					reject(err);
					return;
				}

				storedProcedureParameters = {
					input: [],
					output: []
				};

				results[0].forEach((row) => {
					let parameters;
					switch (row.PARAMETER_MODE) {
						case "IN":
							parameters = storedProcedureParameters.input;
							break;
						case "OUT":
							parameters = storedProcedureParameters.output;
							break;
						default:
							return;
					}

					parameters.push({
						name: row.PARAMETER_NAME,
						type: row.DATA_TYPE
					});
				});

				this.storedProcedureParameterCache[storedProcedureName] = storedProcedureParameters;
				resolve(storedProcedureParameters);
			});
		});
	}
};
