import mysql from "mysql";
import Connection from "./connection.js";
import mySqlErrors from "./mySqlErrors.js";

export default {
	mysql_module: mysql,

	errors: mySqlErrors,
	
	connection: Connection
};