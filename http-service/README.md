# @tix-factory/http-service
TODO

## Example
```js
import http from "@tix-factory/http";
import httpService from "@tix-factory/http-service";

class exampleOperation {
	get allowAnonymous() {
		return true;
	}

	get name() {
		return "Example";
	}

	get route() {
		return "/v1/Example";
	}

	get method() {
		return http.methods.get;
	}

	execute(httpRequest) {
		return new Promise((resolve, reject) => {
			resolve("Hello, world!");
		});
	}
}

const httpClient = new http.client();

const operationRegistry = new httpService.operationRegistry([
	new exampleOperation()
]);

const service = new httpService.server(httpClient, operationRegistry, {
	name: "example-service",
	logName: "TFES1.TixFactory.Example.Service"
});
```