var browserperf = require('..');
browserperf('http://cnn.com', function() {
	console.log(arguments)
}, {
	actions: ['scroll']
});