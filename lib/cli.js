#!/usr/bin/env node

var program = require('commander'),
	bunyan = require('bunyan'),
	bformat = require('bunyan-format'),
	formatOut = bformat({
		outputMode: 'short'
	});

program
	.version('0.0.1')
	.option('-s, --selenium <serverURL>', 'Specify Selenium Server, like localhost:4444 or ondemand.saucelabs.com:80')
	.option('-v --verbose')
	.option('-u --username <username>', 'Sauce, BrowserStack or Selenium User Name')
	.option('-a --accesskey <accesskey>', 'Sauce, BrowserStack or Selenium Access Key')
	.option('-d --debug', 'Enable debug mode, keep the browser alive even after the tests', false)
	.option('-c --config-file <configFile>', 'Specify a configuration file. If other options are specified, they have precedence over options in config file')
	.option('-b --browsers <list of browsers>', 'Browsers to run the test on', function(val) {
		return val.split(',');
	})
	.parse(process.argv);

var log = bunyan.createLogger({
	name: 'CLI',
	level: program.verbose ? 'debug' : 'info',
	stream: formatOut
});


var url = program.args[0];
if (!url) {
	log.error('Please specify a URL to run');
	return;
}

log.info('Running tests for page', url);
require('./index.js')(url, function(err, data) {
	log.info("RESULT \n", data);
}, {
	browsers: program.browsers,
	selenium: program.selenium,
	username: program.username,
	accesskey: program.accesskey,
	debug: program.debug,
	configFile: program.configFile,
	logger: bunyan.createLogger({
		name: 'index.js',
		level: program.verbose ? 'debug' : 'info',
		stream: formatOut,
	})
});