# @tix-factory/http-service
TODO

## Example
```js
import { httpMethods } from "@tix-factory/http";
import { HttpServer } from "@tix-factory/http-service";

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
		return httpMethods.post;
	}

	execute(httpRequest) {
		return new Promise((resolve, reject) => {
			resolve("Hello, world!");
		});
	}
}

const service = new HttpServer({
	name: "example-service",
	logName: "TFES1.TixFactory.Example.Service"
});

service.operationRegistry.registerOperation(new exampleOperation());

service.listen();
```