require('../lib/helpers.js').log(require('bunyan').createLogger({
	name: 'test',
	src: true,
	level: 'debug',
	streams: [{
		path: 'test.log'
	}]
}), true);