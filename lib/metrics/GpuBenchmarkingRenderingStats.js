var BaseMetrics = require('./BaseMetrics'),
	helpers = require('../helpers');

function GpuBenchmarkingRenderingStats() {
	BaseMetrics.apply(this, arguments);
}
require('util').inherits(GpuBenchmarkingRenderingStats, BaseMetrics);

GpuBenchmarkingRenderingStats.prototype.id = 'GpuBenchmarkingRenderingStats';
GpuBenchmarkingRenderingStats.prototype.probes = ['GpuBenchmarkingProbe'];
GpuBenchmarkingRenderingStats.prototype.browsers = ['chrome'];

GpuBenchmarkingRenderingStats.prototype.getResults = function() {
	var data = this.__getDeltas();
	for (var key in data) {
		if (key.match(/Count/gi)) {
			data[key] = helpers.metrics(data[key], 'rendering', this.id, 'count');
		} else if (key.match(/Seconds/)) {
			data[key] = helpers.metrics(data[key], 'rendering', this.id, 'seconds');
		} else {
			data[key] = helpers.metrics(data[key], 'rendering', this.id, 'ms');
		}
	}
	return data;
};

module.exports = GpuBenchmarkingRenderingStats;