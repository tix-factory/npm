# tixfactory.http
TODO

## Example
```js
const http = require("tixfactory.http");
const httpClient = new http.client();

const httpRequest = new http.request(http.methods.get, new URL("https://www.roblox.com/users/profile?username=WebGL3D"));

httpClient.send(httpRequest).then(httpResponse => {
	let headers = httpResponse.headers.map(header => `${header.name}: ${header.value}`);
	console.log(`request finished (${httpResponse.statusCode} ${http.statusTexts[httpResponse.statusCode]})\n\tResponse URL: ${httpResponse.url}\n\t${headers.join("\n\t")}\n\n`, httpResponse.body.toString());
}).catch(console.error);
```
