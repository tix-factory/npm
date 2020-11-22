import mysql from "mysql";
import ConnectionPool from "./connectionPool.js";
import ConfiguredConnection from "./configuredConnection.js";
import mySqlErrors from "./mySqlErrors.js";

export default {
	mysql_module: mysql,

	errors: mySqlErrors,

	connectionPool: ConnectionPool,
	ConfiguredConnection: ConfiguredConnection
};