const http = require("http");

import httpMethods from "./constants/httpMethods.js";
import httpErrors from "./constants/httpErrors";
import HttpRequest from "./httpRequest.js";
import HttpResponse from "./httpResponse.js";
import HttpClient from "./httpClient.js";

exports.methods = httpMethods;
exports.errors = httpErrors;
exports.statusTexts = http.STATUS_CODES;

exports.request = HttpRequest;
exports.response = HttpResponse;
exports.client = HttpClient;
