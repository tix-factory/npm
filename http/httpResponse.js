export default class {
	constructor(rawResponse) {
		this.raw = rawResponse;
		this.headers = [];
		this.headerMap = {};

		for (let i = 0; i < rawResponse.rawHeaders.length; i += 2) {
			let name = rawResponse.rawHeaders[i];
			let value = rawResponse.rawHeaders[i + 1];

			if (!this.headerMap.hasOwnProperty(name)) {
				this.headerMap[name.toLowerCase()] = value;
			}

			this.headers.push({
				name: name,
				value: value
			});
		}
	}

	getHeader(headerName) {
		return this.headerMap[headerName.toLowerCase()];
	}
};