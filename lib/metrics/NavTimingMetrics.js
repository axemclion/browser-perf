var BaseMetrics = require('./BaseMetrics');

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
		result = {
			firstPaint: times.__firstPaint
		};
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
			result[events[i]] = times[events[i]] - times[events[i - 1]];
		}
	}
	return result;
}

module.exports = NavTimingMetrics;