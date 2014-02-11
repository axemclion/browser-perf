var BaseMetrics = require('./BaseMetrics');

function GpuBenchmarkingRenderingStats() {
	BaseMetrics.apply(this, arguments);
}
require('util').inherits(GpuBenchmarkingRenderingStats, BaseMetrics);

GpuBenchmarkingRenderingStats.prototype.id = 'GpuBenchmarkingRenderingStats';
GpuBenchmarkingRenderingStats.prototype.probes = ['GpuBenchmarkingProbe'];
GpuBenchmarkingRenderingStats.prototype.browsers = ['chrome'];

module.exports = GpuBenchmarkingRenderingStats;