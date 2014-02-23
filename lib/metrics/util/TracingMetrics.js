var TracingStats = function(events) {
	this.events = events.sort(function(a, b) {
		return (a.ts >= b.ts ? 1 : -1);
	});

	var self = this;
	self.frame_timestamps = []
	self.frame_times = []
	self.paint_time = []
	self.painted_pixel_count = []
	self.record_time = []
	self.recorded_pixel_count = []
	self.rasterize_time = []
	self.rasterized_pixel_count = []

	this.initMainThreadStatsFromTimeline();
	this.initImplThreadStatsFromTimeline();

}

TracingStats.prototype.initMainThreadStatsFromTimeline = function() {
	var self = this,
		events = this.events,
		first_frame = true;
	for (var i = 0; i < events.length - 1; i++) {
		var event = events[i];
		var frame_count = event.args['data']['frame_count']
		if (frame_count > 1)
			throw 'trace contains multi-frame render stats'
		if (frame_count == 1) {
			self.frame_timestamps.push(event.ts / 1000); // There is no event.start, only event.ts
			if (!first_frame)
				self.frame_times.push(self.frame_timestamps[self.frame_timestamps.length - 1] - self.frame_timestamps[self.frame_timestamps.length - 2]);
			first_frame = false;
		}

		self.paint_time.push(1000.0 * event.args['data']['paint_time'])
		self.painted_pixel_count.push(event.args['data']['painted_pixel_count'])
		self.record_time.push(1000.0 * event.args['data']['record_time'])
		self.recorded_pixel_count.push(event.args['data']['recorded_pixel_count'])
	}
};

TracingStats.prototype.initImplThreadStatsFromTimeline = function() {
	var self = this,
		events = this.events,
		first_frame = true;
	for (var i = 0; i < events.length - 1; i++) {
		var event = events[i];
		var frame_count = event.args['data']['frame_count']
		if (frame_count > 1) throw 'trace contains multi-frame render stats'
		if (frame_count == 1) {
			self.frame_timestamps.push(event.ts / 1000);
			if (!first_frame)
				self.frame_times.push(self.frame_timestamps[self.frame_timestamps.length - 1] - self.frame_timestamps[self.frame_timestamps.length - 2]);
			first_frame = false
		}
		self.rasterize_time.push(1000.0 * event.args['data']['rasterize_time'])
		self.rasterized_pixel_count.push(event.args['data']['rasterized_pixel_count'])
	}
};

// Similar to [chromium_src]/src/tools/perf/metrics/smoothness.py
var TracingMetric = function(data) {
	var self = this;
	self._stats = new TracingStats(data);
}

TracingMetric.prototype.addData = function(results) {
	var statistics = require('./statistics'),
		helpers = require('../../helpers');

	// List of raw frame times.
	var self = this;
	//results['frame_times'] = self._stats.frame_times;

	// Arithmetic mean of frame times.
	var mean_frame_time = statistics.ArithmeticMean(self._stats.frame_times, self._stats.frame_times.length);
	results['mean_frame_time'] = helpers.metrics(mean_frame_time, 'rendering', 'TracingMetrics', 'ms', 5);


	// Absolute discrepancy of frame time stamps.
	var jank = statistics.FrameDiscrepancy(self._stats.frame_timestamps);
	results['jank'] = helpers.metrics(jank, 'rendering', 'TracingMetrics', 'ms', 5);

	// Are we hitting 60 fps for 95 percent of all frames?
	// We use 19ms as a somewhat looser threshold, instead of 1000.0/60.0.
	var percentile = statistics.Percentile(self._stats.frame_times, 80)
	results['mostly_smooth'] = helpers.metrics(percentile, 'rendering', 'TracingMetrics', 'percentile', 5);
	//(percentile < 19.0 ? 1 : 0.0);*/
}

module.exports = TracingMetric;