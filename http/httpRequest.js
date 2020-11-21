export default class {
	constructor(httpMethod, url) {
		this.url = url;
		this.method = httpMethod;
		this.headers = [];
		this.headerMap = {};
		this.body = null;
	}

	getHeader(headerName) {
		return this.headerMap[headerName.toLowerCase()];
	}

	addHeader(name, value) {
		this.headers.push({
			name: name,
			value: value
		});

		if (!this.headerMap.hasOwnProperty(name.toLowerCase())) {
			this.headerMap[name.toLowerCase()] = value;
		}
	}

	addOrUpdateHeader(name, value) {
		for (let i = 0; i < this.headers.length; i++) {
			let header = this.headers[i];
			if (header.name.toLowerCase() === name.toLowerCase()) {
				header.name = name;
				header.value = value;

				this.headerMap[name.toLowerCase()] = value;

				return;
			}
		}

		this.addHeader(name, value);
	}
}