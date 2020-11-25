# @tix-factory/http-service
TODO

## Example
```js
import http from "@tix-factory/http";
import httpService from "@tix-factory/http-service";

class exampleOperation {
	get allowAnonymous() {
		return false;
	}

	get name() {
		return "Example";
	}

	get route() {
		return "/v1/Example";
	}

	get method() {
		return http.methods.post;
	}

	execute(httpRequest) {
		return new Promise((resolve, reject) => {
			resolve("Hello, world!");
		});
	}
}

const service = new httpService.server({
	name: "example-service",
	logName: "TFES1.TixFactory.Example.Service"
});

service.operationRegistry.registerOperation(new exampleOperation());

service.listen();
```