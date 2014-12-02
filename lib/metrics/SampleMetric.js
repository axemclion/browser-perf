var Q = require('q'),
	debug = require('debug')('bp:metrics:SampleMetrics'),
	BaseMetrics = require('./BaseMetrics');

function SampleMetrics(probes) {
	BaseMetrics.apply(this, [{
		probes: probes
	}]);
}
require('util').inherits(SampleMetrics, BaseMetrics);

SampleMetrics.prototype.id = 'SampleMetrics';
SampleMetrics.prototype.probes = ['SampleProbe'];

SampleMetrics.prototype.setup = function() {
	debug('Setup Method called');
	return Q.delay(1);
}

SampleMetrics.prototype.start = function() {
	debug('Start Method called');
	return Q.delay(1);
}

SampleMetrics.prototype.teardown = function() {
	debug('Teardown Method called');
	return Q.delay(1);
}

SampleMetrics.prototype.onData = function() {
	debug('onData Method called');
}

SampleMetrics.prototype.onError = function() {
	debug('onError Method called');
}

SampleMetrics.prototype.getResults = function() {
	debug('Get Results called');
	return {};
}

module.exports = SampleMetrics;