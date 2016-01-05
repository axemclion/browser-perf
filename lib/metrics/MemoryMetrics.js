var Q = require('q'),
	debug = require('debug')('bp:metrics:MemoryMetrics'),
	BaseMetrics = require('./BaseMetrics');

function MemoryMetrics(probes) {
	BaseMetrics.apply(this, [{
		probes: probes
	}]);
}
require('util').inherits(MemoryMetrics, BaseMetrics);

MemoryMetrics.prototype.id = 'MemoryMetrics';
MemoryMetrics.prototype.probes = ['MemoryProbe'];

MemoryMetrics.prototype.setup = function() {
	this.results = [];
}

MemoryMetrics.prototype.start = function() {
}

MemoryMetrics.prototype.onData = function(data) {
	this.results.push(data);
}

MemoryMetrics.prototype.onError = function() {
	debug('onError Method called');
}

MemoryMetrics.prototype.getResults = function() {
    var totalmin = Number.MAX_VALUE, totalmax = 0, totalavg = 0,
        usedmin = Number.MAX_VALUE, usedmax = 0, usedavg = 0;

    this.results.forEach(function(v) {
        if(v.totalJSHeapSize < totalmin) {
            totalmin = v.totalJSHeapSize;
        }
		if(v.totalJSHeapSize > totalmax) {
			totalmax = v.totalJSHeapSize;
		}
		totalavg += v.totalJSHeapSize;

		if(v.usedJSHeapSize < usedmin) {
			usedmin = v.usedJSHeapSize;
		}
		if(v.usedJSHeapSize > usedmax) {
			usedmax = v.usedJSHeapSize;
		}
		usedavg += v.usedJSHeapSize;
    });

	usedavg /= this.results.length;
	totalavg /= this.results.length;

	return {
        totalJSHeapSize_max: totalmax,
        totalJSHeapSize_min: totalmin,
        totalJSHeapSize_avg: totalavg,
        usedJSHeapSize_max: usedmax,
        usedJSHeapSize_min: usedmin,
        usedJSHeapSize_avg: usedavg,
	}
}

module.exports = MemoryMetrics;
