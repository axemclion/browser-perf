var BaseMetrics = require('./BaseMetrics'),
	helpers = require('../helpers');

function NetworkTimings() {
	BaseMetrics.apply(this, arguments);
}
require('util').inherits(NetworkTimings, BaseMetrics);

NetworkTimings.prototype.id = 'NetworkTimings';
NetworkTimings.prototype.probes = ['NavTimingProbe'];

NetworkTimings.prototype.onData = function(data) {
	this.__timing = data;
}

NetworkTimings.prototype.getResults = function(cfg, browser) {
	var times = this.__timing;
	times.firstPaint = times.firstPaint;
	delete times.__firstPaint;
	return times;
}

module.exports = NetworkTimings;