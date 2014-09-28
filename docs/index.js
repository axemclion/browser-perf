var Docs = function(source) {
	var glob = require('glob');
	var fs = require('fs');
	var path = require('path');

	var files;
	if (typeof source !== 'undefined' && typeof source === 'string') {
		files = [source + '.json'];
	} else if (Array.isArray(source)) {
		files = source.map(function(file) {
			return file + (path.extname(file) !== '.json' ? '.json' : '');
		});
	} else {
		files = glob.sync('*.json', {
			cwd: __dirname
		});
	}

	this.metrics = {};
	for (var i = 0; i < files.length; i++) {
		var fileContent = JSON.parse(fs.readFileSync(path.join(__dirname, files[i]), 'utf-8'));
		for (var key in fileContent) {
			this.metrics[key] = fileContent[key];
		}
	}
};

Docs.prototype.get = function(metric) {
	return this.metrics[metric] || {};
};

Docs.prototype.getProp = function(metric, prop) {
	return (typeof this.metrics[metric] !== 'undefined' ? this.metrics[metric][prop] : undefined);
};

module.exports = Docs;