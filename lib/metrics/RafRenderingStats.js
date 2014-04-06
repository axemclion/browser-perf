var BaseMetrics = require('./BaseMetrics'),
	helpers = require('../helpers'),
	log = helpers.log();

function RafBenchmarkingRenderingStats() {
	BaseMetrics.apply(this, arguments);
}
require('util').inherits(RafBenchmarkingRenderingStats, BaseMetrics);

RafBenchmarkingRenderingStats.prototype.id = 'RafBenchmarkingRenderingStats';
RafBenchmarkingRenderingStats.prototype.probes = ['RafBenchmarkingProbe'];

RafBenchmarkingRenderingStats.prototype.getResults = function() {
	if (this.__data.length > 0) {
		return {
			numAnimationFrames: helpers.metrics(this.__data[0].length - 1, 'rendering', this.id, 'count', 0),
			numFramesSentToScreen: helpers.metrics(this.__data[0].length - 1, 'rendering', this.id, 'count', 0),
			droppedFrameCount: helpers.metrics(this.getDroppedFrameCount_(this.__data[0]), 'rendering', this.id, 'count', 2),
			meanFrameTime: helpers.metrics(this.getMeanFrameTime_(this.__data[0]), 'rendering', this.id, 'ms', 2)
		};
	} else {
		log.debug('[RafBenchmarkingRenderingStats]: Did not get enough data to calculate metrics');
		return {};
	}
}

RafBenchmarkingRenderingStats.prototype.getMeanFrameTime_ = function(frameTimes) {
	var num_frames_sent_to_screen = frameTimes.length;
	var mean_frame_time_seconds = (frameTimes[frameTimes.length - 1] - frameTimes[0]) / num_frames_sent_to_screen;
	return mean_frame_time_seconds;
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