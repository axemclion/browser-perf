// Event format for Chromium - https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit
// Similar to [chromium_src]/src/tools/perf/metrics/rendering_stats.py

var RenderingStats = function(events) {
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

RenderingStats.prototype.initMainThreadStatsFromTimeline = function() {
	var self = this,
		events = this.events,
		first_frame = true;
	for (var i = 0; i < events.length - 1; i++) {
		var event = events[i];
		// Was called frame_count, but JSON does not have that. Assuming it is screen_frame_count
		var frame_count = event.args['data']['screen_frame_count'];
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

RenderingStats.prototype.initImplThreadStatsFromTimeline = function() {
	var self = this,
		events = this.events,
		first_frame = true;
	for (var i = 0; i < events.length - 1; i++) {
		var event = events[i];
		var frame_count = event.args['data']['screen_frame_count']
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
}

module.exports = RenderingStats;