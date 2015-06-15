var BaseMetrics = require('./BaseMetrics'),
	helpers = require('../helpers');

function NetworkTimings() {
	BaseMetrics.apply(this, arguments);
}
require('util').inherits(NetworkTimings, BaseMetrics);

NetworkTimings.prototype.id = 'NetworkTimings';
NetworkTimings.prototype.probes = ['NavTimingProbe'];

NetworkTimings.prototype.onData = function(data) {
	this.timing = data;
}

NetworkTimings.prototype.getResults = function(cfg, browser) {

	// More useful representation of timing information
	// Credit : https://github.com/addyosmani/timing.js
	this.addMetric('loadTime', 'loadEventEnd', 'fetchStart');
	this.addMetric('domReadyTime', 'domComplete', 'domInteractive');
	this.addMetric('readyStart', 'fetchStart', 'navigationStart');
	this.addMetric('redirectTime', 'redirectEnd', 'redirectStart');
	this.addMetric('appcacheTime', 'domainLookupStart', 'fetchStart');
	this.addMetric('unloadEventTime', 'unloadEventEnd', 'unloadEventStart');
	this.addMetric('domainLookupTime', 'domainLookupEnd', 'domainLookupStart');
	this.addMetric('connectTime', 'connectEnd', 'connectStart');
	this.addMetric('requestTime', 'responseEnd', 'requestStart');
	this.addMetric('initDomTreeTime', 'domInteractive', 'responseEnd');
	this.addMetric('loadEventTime', 'loadEventEnd', 'loadEventStart');

	return this.timing;
}

NetworkTimings.prototype.addMetric = function(prop, a, b) {
	if (typeof this.timing[a] === 'number' && typeof this.timing[b] === 'number') {
		this.timing[prop] = this.timing[a] - this.timing[b];
	}
}

module.exports = NetworkTimings;