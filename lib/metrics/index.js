var builtInMetrics = [
	'GpuBenchmarkingRenderingStats',
	'RafRenderingStats',
	'NavTimingMetrics'
]

var Q = require('q'),
	helpers = require('../helpers'),
	log = helpers.log();

function Metrics(metrics) {
	this.metrics = require('../helpers').initConstructors(metrics || [], 'metrics/', {});
}

Metrics.prototype.__loop = function(method, args) {
	log.debug('[Metrics]:' + method);
	return Q.allSettled(this.metrics.map(function(metric) {
		if (typeof metric[method] === 'function') {
			return metric[method].apply(metric, args)
		} else {
			return Q();
		}
	}));
}

Metrics.prototype.setup = function() {
	return this.__loop('setup', arguments);
};

Metrics.prototype.start = function() {
	return this.__loop('start', arguments);
};

Metrics.prototype.teardown = function() {
	return this.__loop('teardown', arguments);
};

Metrics.prototype.getResults = function() {
	return this.__loop('getResults', arguments).spread(function() {
		var res = {};
		Array.prototype.slice.call(arguments, 0).forEach(function(val) {
			if (val.state === 'fulfilled') {
				helpers.extend(res, val.value);
			}
		});
		return res;
	}, function(err) {
		return err;
	})
};


module.exports = Metrics;
module.exports.builtIns = builtInMetrics;