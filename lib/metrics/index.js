var Q = require('q'),
	helpers = require('../helpers'),
	ProbeManager = require('../probes'),
	log = helpers.log();

function Metrics(metrics) {
	log.debug('Initializing Metrics');
	var me = this,
		probeManager = this.probeManager = new ProbeManager();
	this.metrics = metrics.map(function(metric) {
		var res = null;
		if (typeof metric === 'string') {
			var fn = require('./' + metric);
			res = new fn();
		} else if (typeof metric === 'object') {
			res = metric;
		}
		probeManager.addProbes(res);
		return res;
	}).filter(function(metric) {
		return (typeof metric === 'object')
	});
}

Metrics.prototype.allMetrics = function(method, args) {
	return this.metrics.map(function(metric) {
		return function() {
			log.debug('[Metric]: ', metric.id, method, typeof metric[method] === 'function' ? 'called' : 'not called');
			if (typeof metric[method] === 'function') {
				return metric[method].apply(metric, args);
			} else {
				return Q();
			}
		}
	}).reduce(Q.when, Q());
}

Metrics.prototype.setup = function(cfg) {
	var me = this;
	return this.allMetrics('setup', [cfg]).then(function() {
		return me.probeManager.setup(cfg);
	});
};

Metrics.prototype.start = function(browsers) {
	var me = this;
	return this.allMetrics('start', [browsers]).then(function() {
		return me.probeManager.start(browsers);
	});
}
Metrics.prototype.teardown = function(browsers) {
	var me = this;
	return this.probeManager.teardown(browsers).then(function() {
		return me.allMetrics('teardown', [browsers]);
	});
}

Metrics.prototype.getResults = function() {
	log.debug('[Metrics]: Getting Results');
	var args = arguments;
	return Q.allSettled(this.metrics.map(function(metric) {
		if (typeof metric.getResults === 'function') {
			log.debug('Getting results from ', metric.id);
			return metric.getResults.apply(metric, args);
		} else {
			return Q();
		}
	})).spread(function() {
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
module.exports.builtIns = [
	'GpuBenchmarkingRenderingStats',
	'RafRenderingStats',
	'NavTimingMetrics',
	'ChromeTimelineMetrics',
	'ChromeTracingMetrics'
]