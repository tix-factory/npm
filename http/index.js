import http from "http";

import httpMethods from "./constants/httpMethods.js";
import httpErrors from "./constants/httpErrors.js";
import HttpRequest from "./httpRequest.js";
import HttpResponse from "./httpResponse.js";
import HttpClient from "./httpClient.js";

export default {
	methods: httpMethods,
	errors: httpErrors,
	statusTexts: http.STATUS_CODES,

	request: HttpRequest,
	response: HttpResponse,
	client: HttpClient
};
