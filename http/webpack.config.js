const path = require("path");
const nodeExternals = require('webpack-node-externals');

module.exports = {
	target: "node",
	entry: "./index.js",
	devtool: "source-map",
	externals: [nodeExternals()],
	output: {
		filename: "[name].js",
		path: path.resolve(__dirname, "dist")
	},
	module: {
		rules: [
			{
				test: /.js$/,
				enforce: "pre",
				use: ["source-map-loader"]
			}
		]
	}
};
