# @tix-factory/configuration-client
TODO

## Example
```js
import configurationClientModule from "@tix-factory/configuration-client";
import http from "@tix-factory/http";

const httpClient = new http.client();
const configurationClient = new configurationClientModule.configurationClient(httpClient, {
	warn: console.warn.bind(console)
}, {
	example: "Hello, world!"
});

configurationClient.getSettingValue("example").then(value => {
	// Hello, world!
	// or the value specified in the application configuration service
}).catch(err => {
	// Failed to load settings from application configuration service
	console.error(err);
});
```