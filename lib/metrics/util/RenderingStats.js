/* 
based on 
https://chromium.googlesource.com/chromium/src/+/e2f820e34c43102785cfc9f38bde8b5a052938b8/tools/telemetry/telemetry/web_perf/metrics/rendering_stats.py
Just picking up mean frame time, ignoring everything about InputLatency

Just returns frame_times and frame_timestamps that are used to calculate the metrics in 
https://chromium.googlesource.com/chromium/src/+/e2f820e34c43102785cfc9f38bde8b5a052938b8/tools/telemetry/telemetry/web_perf/metrics/smoothness.py
*/

var debug = require('debug')('bp:metrics:RenderingStats');

function GetTimestampEventName(events) {
	for (var i = 0; i < events.length; i++) {
		var event = events[i];
		if (event.name === 'BenchmarkInstrumentation::DisplayRenderingStats' || event.name === 'BenchmarkInstrumentation::MainThreadRenderingStats') {
			if (typeof event.args.data !== 'undefined' && event.args['data']['frame_count'] === 1) {
				return event.name;
			}
		}
	}
	return 'BenchmarkInstrumentation::ImplThreadRenderingStats';
};

var RenderingStats = function(events) {
	this.events = events.sort(function(a, b) {
		return (a.ts >= b.ts ? 1 : -1);
	});

	timestamp_event_name = GetTimestampEventName(this.events);
	debug('Timestamp Event name is ', timestamp_event_name);

	this.frame_timestamps = [];
	this.frame_times = [];
	this.approximated_pixel_percentages = [];

	this.processId = findRenderProcess(this.events);
	debug('Process ID for render process is ', this.processId);

	this._InitFrameTimestampsFromTimeline(this.events, timestamp_event_name);
	this._InitImplThreadRenderingStatsFromTimeline(this.events);
};


function findRenderProcess(events) {
	// TODO - Find a better way to identify the running process - will break if site opens tabs
	for (var i = 0; i < events.length; i++) {
		if (events[i].name === 'process_labels') {
			return events[i].pid;
		}
	}
};

RenderingStats.prototype._GatherEvents = function(event_name, events, timeline_range) {
	var processId = this.processId;
	return events.filter(function(event) {
		return event.pid === processId && event.name === event_name && typeof event.args !== 'undefined' && typeof event.args.data !== 'undefined';
	});
};

RenderingStats.prototype._AddFrameTimestamp = function(event) {
	var frame_count = event.args['data']['frame_count'];
	if (frame_count > 1) {
		debug('trace contains multi-frame render stats');
	}
	if (frame_count == 1) {
		this.frame_timestamps.push(event.ts / 1000); // event.start is not available, only event.ts is
		if (this.frame_timestamps.length >= 2) {
			this.frame_times.push(this.frame_timestamps[this.frame_timestamps.length - 1] -
				this.frame_timestamps[this.frame_timestamps.length - 2]);
		}
	}
};

RenderingStats.prototype._InitFrameTimestampsFromTimeline = function(events, timestamp_event_name) {
	var events = this._GatherEvents(timestamp_event_name, events);
	for (var i = 0; i < events.length; i++) {
		this._AddFrameTimestamp(events[i]);
	}
};

RenderingStats.prototype._InitImplThreadRenderingStatsFromTimeline = function(events, timeline_range) {
	var event_name = 'BenchmarkInstrumentation::ImplThreadRenderingStats';
	var events = this._GatherEvents(event_name, events, timeline_range);
	for (var i = 0; i < events.length; i++) {
		var event = events[i]
		var data = event.args['data'];
		if (typeof data['visible_content_area'] !== 'undefined') {
			this.approximated_pixel_percentages.push(data['approximated_visible_content_area'] / data['visible_content_area'] * 100.0);
		} else {
			this.approximated_pixel_percentages.push(0);
		}
	}
}

module.exports = RenderingStats;