require('../lib/helpers.js').setLogger(require('bunyan').createLogger({
	name: 'test',
	src: true,
	level: 'debug',
	streams: [{
		path: 'test.log'
	}]
}), true);