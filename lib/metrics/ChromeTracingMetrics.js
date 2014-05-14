var BaseMetrics = require('./BaseMetrics'),
	helpers = require('../helpers'),
	log = helpers.log();

function ChromeTracingMetrics() {
	BaseMetrics.apply(this, arguments);
	this.timelineMetrics = {};
	this.tracingStats = [];
}

require('util').inherits(ChromeTracingMetrics, BaseMetrics);

ChromeTracingMetrics.prototype.id = 'ChromeTracingMetrics';
ChromeTracingMetrics.prototype.probes = ['ChromeTracingProbe', 'AndroidTracingProbe'];

ChromeTracingMetrics.prototype.getResults = function() {
	var results = {};
	if (this.tracingStats.length > 0) {
		var statistics = require('./util/statistics'),
			stats = new TracingStats(this.tracingStats);

		var mean_frame_time = statistics.ArithmeticMean(stats.frame_times, stats.frame_times.length);
		if (mean_frame_time) {
			results['mean_frame_time'] = helpers.metrics(mean_frame_time, 'rendering', 'ChromeTracingMetrics', 'ms', 5);
		} else {
			log.warn('[TracingMetrics]: Mean frame time is null, number of frames are ', stats.frame_times.length);
		}

		// Absolute discrepancy of frame time stamps.
		var jank = statistics.FrameDiscrepancy(stats.frame_timestamps);
		if (!isNaN(jank)) {
			results['jank'] = helpers.metrics(jank, 'rendering', 'ChromeTracingMetrics', 'ms', 5);
		} else {
			log.warn('[TracingMetrics]: Jank was not a number');
		}

		// Are we hitting 60 fps for 95 percent of all frames?
		// We use 19ms as a somewhat looser threshold, instead of 1000.0/60.0.
		var percentile = statistics.Percentile(stats.frame_times, 80)
		results['mostly_smooth'] = helpers.metrics(percentile, 'rendering', 'ChromeTracingMetrics', 'percentile', 5);
		//(percentile < 19.0 ? 1 : 0.0);*/
	} else {
		log.debug('[TracingMetrics]: No Tracing data found');
	}
	return results;
};

ChromeTracingMetrics.prototype.onData = function(data) {
	this.tracingStats = data.value;
}


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
		if (!event.name === "ImplThreadRenderingStats::IssueTraceEvent" && event.name !== "MainThreadRenderingStats::IssueTraceEvent") {
			continue;
		}
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
		if (!event.name === "BenchmarkInstrumentation::ImplThreadRenderingStats" && event.name !== "BenchmarkInstrumentation::MainThreadRenderingStats") {
			continue;
		}

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

module.exports = ChromeTracingMetrics;