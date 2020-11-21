export default class {
	constructor() {
	}

	execute(httpRequest) {
		return new Promise((resolve, reject) => {
			try {
				let requestBody = null;
				if (request.body && request.body.length > 0) {
					requestBody = JSON.parse(request.body.toString());
				}
	
				httpRequest.operation.execute(requestBody).then((data) => {
					if (!data) {
						const noContentResponse = new http.response(204);
						resolve(noContentResponse);
						return;
					}
	
					if (operation.name === "favicon") {
						resolve(data);
						return;
					}
	
					let responseBody = {
						data: data
					};
	
					if (operation.name === "ApplicationMetadata") {
						responseBody = data;
					}
	
					const successResponse = new http.response(200);
					successResponse.addOrUpdateHeader("Content-Type", "application/json");
					successResponse.body = Buffer.from(JSON.stringify(responseBody));
	
					resolve(successResponse);
				}).catch(err => {
					if (typeof(err) === "string") {
						const errorResponse = new http.response(400);
						errorResponse.addOrUpdateHeader("Content-Type", "application/json");
						errorResponse.body = Buffer.from(JSON.stringify({
							error: err
						}));
	
						resolve(errorResponse);
					} else {
						reject(err);
					}
				});
			} catch (e) {
				const internalServerErrorResponse = new http.response(500);
				internalServerErrorResponse.addOrUpdateHeader("Content-Type", "application/json");
				internalServerErrorResponse.body = Buffer.from("{}");

				resolve(internalServerErrorResponse);
			}
		});
	}
};
