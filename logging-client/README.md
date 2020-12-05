# @tix-factory/logging-client
TODO

## Example
```js
import { Logger } from "@tix-factory/logging-client";
import { HttpClient } from "@tix-factory/http";

const httpClient = new HttpClient();
const logger = new Logger(httpClient);

logger.error("hello world", "abc", 123);
```