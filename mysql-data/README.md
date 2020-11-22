# @tix-factory/mysql-data
TODO

## Example
```js
import mysql from "@tix-factory/mysql-data";

const connectionString = "...";
const connection = new mysql.connection(connectionString, {
	// Only valid if the connection has SslMode=REQUIRED
	sslCertificateFileName: `${__dirname}/ca-certificate.crt`;
});

connection.executeReadStoredProcedure("MyStoredProcedureName", {
	ParamterName: "ParameterValue",
	SomeDateParameter: new Date()
}).then(rows => {
	// Rows returned
}).catch(console.error);

connection.executeWriteStoredProcedure("SomeStoredProcedureName", {
	Hoopla: "Hooooopla"
}).then(rowsAffected => {
	// Number of rows affected
}).catch(console.error);
```