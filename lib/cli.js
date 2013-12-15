var program = require('commander'),
	bunyan = require('bunyan'),
	bformat = require('bunyan-format'),
	formatOut = bformat({
		outputMode: 'short'
	});

program
	.version('0.0.1')
	.option('-s, --selenium <serverURL>', 'Specify Selenium Server, like localhost:4444 or ondemand.saucelabs.com:80', 'ondemand.saucelabs.com:80')
	.option('-v --verbose')
	.option('-u --username', 'Sauce or Selenium User Name')
	.option('-a --accesskey', 'Sauce or Selenium Access Key')
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

program.username = program.username || process.env.SAUCE_USERNAME;
program.accesskey = program.accesskey || process.env.SAUCE_ACCESS_KEY;
if (program.selenium.match('ondemand.saucelabs') && (!program.username || !program.accesskey)) {
	log.error('Saucelabs is used but no username or password is specified');
	return;
}

log.info('Running tests for page', url);
log.info('Using Selenium server', program.selenium);

require('./index.js')(url, function(err, data) {
	log.info("RESULT \n", data);
}, {
	browsers: program.browsers,
	selenium: {
		host: program.selenium,
		user: program.username,
		pwd: program.accesskey,
	},
	logger: bunyan.createLogger({
		name: 'index.js',
		level: program.verbose ? 'debug' : 'info',
		stream: formatOut
	})
});