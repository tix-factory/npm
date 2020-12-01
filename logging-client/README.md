# @tix-factory/logging-client
TODO

## Example
```js
import { Logger } from "@tix-factory/logging-client";
import http from "@tix-factory/http";

const httpClient = new http.client();
const logger = new Logger(httpClient);

logger.error("hello world", "abc", 123);
```