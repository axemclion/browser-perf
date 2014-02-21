var Q = require('q'),
	BaseMetrics = require('./BaseMetrics'),
	log = require('../helpers').log();

function SampleMetrics(probes) {
	BaseMetrics.apply(this, [{
		probes: probes
	}]);
}
require('util').inherits(SampleMetrics, BaseMetrics);

SampleMetrics.prototype.id = 'SampleMetrics';
SampleMetrics.prototype.probes = ['SampleProbe'];

SampleMetrics.prototype.setup = function() {
	log.debug('[SampleMetric]: Setup Method called');
	return Q.delay(1);
}

SampleMetrics.prototype.start = function() {
	log.debug('[SampleMetric]: Start Method called');
	return Q.delay(1);
}

SampleMetrics.prototype.teardown = function() {
	log.debug('[SampleMetric]: Teardown Method called');
	return Q.delay(1);
}

SampleMetrics.prototype.onData = function() {
	log.debug('[SampleMetric]: onData Method called');
}

SampleMetrics.prototype.onError = function() {
	log.debug('[SampleMetric]: onError Method called');
}

SampleMetrics.prototype.getResults = function() {
	log.debug('[SampleMetric]: Get Results called');
	return {};
}

module.exports = SampleMetrics;