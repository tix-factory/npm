# @tix-factory/http
TODO

## Example
```js
const http = require("@tix-factory/http");
const httpClient = new http.client();

const httpRequest = new http.request(http.methods.get, new URL("https://www.roblox.com/users/profile?username=WebGL3D"));

httpClient.send(httpRequest).then(httpResponse => {
	let headers = httpResponse.headers.map(header => `${header.name}: ${header.value}`);
	console.log(`request finished (${httpResponse.statusCode} ${http.statusTexts[httpResponse.statusCode]})\n\tResponse URL: ${httpResponse.url}\n\t${headers.join("\n\t")}\n\n`, httpResponse.body.toString());
}).catch(console.error);
```
```js
const http = require("@tix-factory/http");
const httpServer = new http.server({
	errorHandler: err => {
		consolee.error("unexpected exception with request", err);
	}
});

const queueProcessor = new queueing.QueueProcessor({
	numberOfThreads: 3
}, httpServer.requestQueue, request => {
	return new Promise((resolve, reject) => {
		//console.log("processing", request.data.url.toString());

		if (request.data.url.pathname === "/favicon.ico") {
			const httpResponse = new http.response(404);
			httpResponse.addHeader("Content-Type", "application/json");
			httpResponse.body = Buffer.from(JSON.stringify({}));

			request.resolve(httpResponse);
			return;
		}

		setTimeout(() => {
			const httpResponse = new http.response(200);
			httpResponse.addHeader("Content-Type", "application/json");
			httpResponse.body = Buffer.from(JSON.stringify({}));

			request.resolve(httpResponse);

			resolve(true);
		}, 5 * 1000);
	});
});
```