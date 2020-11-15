const fs = require("fs");
const npmrcFileName = process.argv[2];
const npmrcEmail = process.argv[3];
const npmrcToken = process.argv[4];

fs.readFile(npmrcFileName, (err, data) => {
	if (err) {
		console.error("readFile", err);
		process.exit(1);
		return;
	}

	const npmrcContents = data.toString().replace("<token>", npmrcToken).replace("<email>", npmrcEmail);
	fs.writeFile(npmrcFileName, npmrcContents, (err) => {
		if (err) {
			console.error("writeFile", err);
			process.exit(1);
			return;
		}

		console.log(npmrcContents);
	});
});