var BaseMetrics = require('./BaseMetrics'),
	helpers = require('../helpers');

function RafBenchmarkingRenderingStats() {
	BaseMetrics.apply(this, arguments);
}
require('util').inherits(RafBenchmarkingRenderingStats, BaseMetrics);

RafBenchmarkingRenderingStats.prototype.id = 'RafBenchmarkingRenderingStats';
RafBenchmarkingRenderingStats.prototype.probes = ['RafBenchmarkingProbe'];

RafBenchmarkingRenderingStats.prototype.getResults = function() {
	return {
		numAnimationFrames: helpers.metrics(this.__data[0].length - 1, 'render', 'count', 0),
		numFramesSentToScreen: helpers.metrics(this.__data[0].length - 1, 'render', 'count', 0),
		droppedFrameCount: helpers.metrics(this.getDroppedFrameCount_(this.__data[0]), 'render', 'count', 2)
	};
}

RafBenchmarkingRenderingStats.prototype.getDroppedFrameCount_ = function(frameTimes) {
	var droppedFrameCount = 0;
	var droppedFrameThreshold = 1000 / 55;
	for (var i = 1; i < frameTimes.length; i++) {
		var frameTime = frameTimes[i] - frameTimes[i - 1];
		if (frameTime > droppedFrameThreshold)
			droppedFrameCount += Math.floor(frameTime / droppedFrameThreshold);
	}
	return droppedFrameCount;
};

module.exports = RafBenchmarkingRenderingStats;