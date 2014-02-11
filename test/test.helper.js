require('../lib/helpers.js').setLogger(require('bunyan').createLogger({
	name: 'test',
	src: true,
	streams: [{
		path: 'test.log'
	}]
}));