# @tix-factory/mongodb
TODO: Lots more documentation

## Examples
```js
import { MongoConnection } from "@tix-factory/mongodb";

const mongoConnectionString = process.env.MONGO_CONNECTION_STRING;
const mongoConnection = new MongoConnection(mongoConnectionString);
const mongoCollection = await mongoConnection.getCollection("project name/database name", "collection name");

mongoCollection.insert({
	"name": "Hello, world!"
}).then(rowId => {
	// e.g. 31262747691000
	console.log("row added to collection\n\tID:", rowId);
}).catch(err => {
	console.error("failed to insert into collection", err);
});
```
```js
import { IdGenerator } from "@tix-factory/mongodb";

const idGenerator = new IdGenerator({});
// e.g. 31262747691000
console.log(idGenerator.generate());
```