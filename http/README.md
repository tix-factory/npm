# @tix-factory/http
TODO

## Example
```js
import http from "http";
import { HttpClient, HttpRequest, httpMethods } from "@tix-factory/http";
const httpClient = new HttpClient();

const httpRequest = new HttpRequest(httpMethods.get, new URL("https://www.roblox.com/users/profile?username=WebGL3D"));

httpClient.send(httpRequest).then(httpResponse => {
	let headers = httpResponse.headers.map(header => `${header.name}: ${header.value}`);
	console.log(`request finished (${httpResponse.statusCode} ${http.STATUS_CODES[httpResponse.statusCode]})\n\tResponse URL: ${httpResponse.url}\n\t${headers.join("\n\t")}\n\n`, httpResponse.body.toString());
}).catch(console.error);
```
```js
import { HttpResponse, HttpServer } from "@tix-factory/http";
const httpServer = new HttpServer({
	errorHandler: err => {
		consolee.error("unexpected exception with request", err);
	}
}, httpRequest => {
	return new Promise((resolve, reject) => {
		if (httpRequest.url.pathname === "/favicon.ico") {
			const httpResponse = new HttpResponse(404);
			httpResponse.addHeader("Content-Type", "application/json");
			httpResponse.body = Buffer.from(JSON.stringify({}));

			resolve(httpResponse);
			return;
		}

		setTimeout(() => {
			const httpResponse = new HttpResponse(200);
			httpResponse.addHeader("Content-Type", "application/json");
			httpResponse.body = Buffer.from(JSON.stringify({}));

			resolve(httpResponse);
		}, 5 * 1000);
	});
});
```