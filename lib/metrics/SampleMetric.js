var BaseMetrics = require('./BaseMetrics');

function SampleMetrics() {
	BaseMetrics.apply(this, arguments);
}
require('util').inherits(SampleMetrics, BaseMetrics);

SampleMetrics.prototype.id = 'SampleMetrics';
SampleMetrics.prototype.probes = ['SampleProbe'];

module.exports = SampleMetrics;