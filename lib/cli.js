var program = require('commander'),
	bunyan = require('bunyan'),
	bformat = require('bunyan-format'),
	formatOut = bformat({
		outputMode: 'short'
	});

program
	.version('0.0.1')
	.option('-s, --selenium [type]', 'Specify Selenium Server [http://localhost:4444/wd/hub]', 'http://localhost:4444/wd/hub')
	.option('-v --verbose')
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
log.info('Using Selenium server', program.selenium);

require('./index.js')(url, function(data) {
	log.info(data)
}, {
	selenium: program.selenium,
	logger: bunyan.createLogger({
		name: 'index.js',
		level: program.verbose ? 'debug' : 'info',
		stream: formatOut
	})
});