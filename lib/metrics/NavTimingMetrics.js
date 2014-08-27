var BaseMetrics = require('./BaseMetrics'),
	helpers = require('../helpers');

function NavTimingMetrics() {
	BaseMetrics.apply(this, arguments);
}
require('util').inherits(NavTimingMetrics, BaseMetrics);

NavTimingMetrics.prototype.id = 'NavTimingMetrics';
NavTimingMetrics.prototype.probes = ['NavTimingProbe'];

NavTimingMetrics.prototype.onData = function(data) {
	this.__timing = data;
}

NavTimingMetrics.prototype.getResults = function(cfg, browser) {
	var times = this.__timing,
		result = {};

	if (times.__firstPaint) {
		result.firstPaint = helpers.metrics(times.__firstPaint, 'rendering', this.id)
	}
	var events = [
		'navigationStart',
		'unloadEventStart',
		'unloadEventEnd',
		'redirectStart',
		'redirectEnd',
		'fetchStart',
		'domainLookupStart',
		'domainLookupEnd',
		'connectStart',
		'connectEnd',
		'secureConnectionStart',
		'requestStart',
		'responseStart',
		'domLoading',
		'domInteractive',
		'domContentLoadedEventStart',
		'domContentLoadedEventEnd',
		'domComplete',
		'loadEventStart',
		'loadEventEnd'
	];

	for (var i = 1; i < events.length; i++) {
		if (!times[events[i]]) {
			times[events[i]] = times[events[i - 1]];
		} else {
			result[events[i]] = helpers.metrics(times[events[i]] - times[events[i - 1]], 'navigation', this.id);
		}
	}
	return result;
}

module.exports = NavTimingMetrics;