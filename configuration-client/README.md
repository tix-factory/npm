# @tix-factory/configuration-client
TODO

## Example
```js
import { ConfigurationClient } from "@tix-factory/configuration-client";
import { HttpClient } from "@tix-factory/http";

const httpClient = new HttpClient();
const configurationClient = new ConfigurationClient(httpClient, {
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