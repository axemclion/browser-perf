// Similar to [chromium_src]/src/tools/perf/metrics/smoothness.py

var rendering_stats = require('./rendering_stats.js'),
	statistics = require('./statistics');
var SmoothnessMetric = function(data) {
	var self = this;
	self._stats = new rendering_stats(data);
}

SmoothnessMetric.prototype.addData = function(results) {
	// List of raw frame times.
	var self = this;
	//results['frame_times'] = self._stats.frame_times;

	// Arithmetic mean of frame times.
	var mean_frame_time = statistics.ArithmeticMean(self._stats.frame_times, self._stats.frame_times.length);
	if (typeof results['mean_frame_time'] === 'undefined') {
		results['mean_frame_time'] = mean_frame_time;
	} else {
		results['mean_frame_time_extension'] = mean_frame_time;
	}

	// Absolute discrepancy of frame time stamps.
	var jank = statistics.FrameDiscrepancy(self._stats.frame_timestamps);
	results['jank'] = jank;

	// Are we hitting 60 fps for 95 percent of all frames?
	// We use 19ms as a somewhat looser threshold, instead of 1000.0/60.0.
	var percentile = statistics.Percentile(self._stats.frame_times, 80)
	results['mostly_smooth'] = percentile; //(percentile < 19.0 ? 1 : 0.0);*/
}

module.exports = SmoothnessMetric;