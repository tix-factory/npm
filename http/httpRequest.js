export default class {
	constructor(httpMethod, url) {
		this.url = url;
		this.method = httpMethod;
		this.headers = [];
	}

	addHeader(name, value) {
		this.headers.push({
			name: name,
			value: value
		});
	}

	addOrUpdateHeader(name, value) {
		for (let i = 0; i < this.headers.length; i++) {
			let header = this.headers[i];
			if (header.name.toLowerCase() === name.toLowerCase()) {
				header.name = name;
				header.value = value;

				return;
			}
		}

		this.addHeader(name, value);
	}
}