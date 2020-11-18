# @tix-factory/http-service
TODO

## Example
```js
const httpService = require("@tix-factory/http-service");

const operationRegistry = new httpService.operationRegistry({
	"exampleException": ""
});

const httpService = new httpService.server(operationRegistry, {
	name: "queue-service",
	logName: "TFQS2.TixFactory.Queue.Service"
});
```