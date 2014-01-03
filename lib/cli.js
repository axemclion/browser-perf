#!/usr/bin/env node

var program = require('commander');

program
	.version('0.0.1')
	.option('-s, --selenium <serverURL>', 'Specify Selenium Server, like localhost:4444 or ondemand.saucelabs.com:80')
	.option('-v --verbose')
	.option('-u --username <username>', 'Sauce, BrowserStack or Selenium User Name')
	.option('-a --accesskey <accesskey>', 'Sauce, BrowserStack or Selenium Access Key')
	.option('-d --debug', 'Enable debug mode, keep the browser alive even after the tests', false)
	.option('-c --config-file <configFile>', 'Specify a configuration file. If other options are specified, they have precedence over options in config file')
	.option('-o --output <output>', 'Format of output [table|json], defaults to table')
	.option('-b --browsers <list of browsers>', 'Browsers to run the test on', function(val) {
		return val.split(',');
	})
	.parse(process.argv);

var log = {
	'fatal': console.error.bind(console),
	'error': console.error.bind(console),
	'warn': console.warn.bind(console),
	'info': console.info.bind(console),
	'debug': console.log.bind(console),
	'trace': console.trace.bind(console),
}

var url = program.args[0];
if (!url) {
	log.error('Please specify a URL to run');
	return;
}
program.output = program.output || 'table';

log.info('Running tests for page', url);
require('./index.js')(url, function(err, data) {

	if (program.output === 'table') {
		log.info(generateTable(data))
	} else {
		log.info(data);
	}
}, {
	browsers: program.browsers,
	selenium: program.selenium,
	username: program.username,
	accesskey: program.accesskey,
	debug: program.debug,
	configFile: program.configFile,
	logger: (function(log) {
		log.trace = function() {}
		if (!program.verbose) {
			log.debug = log.trace;
		}
		return log;
	}(log))
});

function generateTable(data) {
	var cliTable = require('cli-table'),
		res = [];
	for (var i = 0; i < data.length; i++) {
		var table = new cliTable({
			head: ['Metrics', 'Value', 'Type'],
			colAligns: ['right', 'left'],
			colWidths: [35, 20, 10]
		});
		res.push('\n', data[i]._browserName, '\n');
		for (var key in data[i]) {
			if (key.indexOf('_') === 0)
				continue;
			var val = data[i][key];
			var type = key.substring(key.lastIndexOf("_") + 1);
			if (type !== 'avg' && type !== 'max' && type !== 'ms') {
				type = '';
			} else {
				key = key.replace('_' + type, '');
			}
			table.push([key, val, type]);
		}
		table = table.sort(function(a, b) {
			return a[0] > b[0] ? 1 : -1;
		});
		res.push(table.toString());
	}
	return res.join('');
}