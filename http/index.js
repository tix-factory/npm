import httpMethods from "./constants/httpMethods.js";
import httpErrors from "./constants/httpErrors";
import HttpRequest from "./httpRequest.js";
import HttpResponse from "./httpResponse.js";
import HttpClient from "./httpClient.js";

module.exports = {
	methods: httpMethods,
	errors: httpErrors,

	request: HttpRequest,
	response: HttpResponse,
	client: HttpClient
};