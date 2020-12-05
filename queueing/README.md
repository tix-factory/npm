# @tix-factory/queueing
TODO

## Example
```js
import { HttpClient } from "@tix-factory/http";
import { RemoteQueue, QueueProcessor } from "@tix-factory/queueing";

const httpClient = new HttpClient();
//const queue = new queueing.VirtualQueue();
const queue = new RemoteQueue(httpClient, console, {
	queueName: "Example",
	countRefreshInterval: 1000
});

const queueProcessor = new QueueProcessor({
	numberOfThreads: 10,
	itemLockDurationInMilliseconds: 15 * 1000
}, queue, item => {
	return new Promise((resolve, reject) => {
		console.log("leased", item);
		// Resolve false to indicate the item should be retried
		// Reject will be retried after the lock expiration
		resolve(true);
	});
});

queue.on("sizeChanged", (data) => {
	//console.log("sizeChanged", data);
});

queue.on("heldSizeChanged", (data) => {
	//console.log("heldSizeChanged", data);
});

for (var i = 0; i < 50; i++) {
	queue.push("Hello, world!");
	queue.push("abc");
	queue.push("xyz");
}
```