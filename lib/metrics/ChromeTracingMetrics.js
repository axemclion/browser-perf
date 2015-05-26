/*
Based on 
https://chromium.googlesource.com/chromium/src/+/e2f820e34c43102785cfc9f38bde8b5a052938b8/tools/telemetry/telemetry/web_perf/metrics/smoothness.py
*/

var Q = require('q'),
	BaseMetrics = require('./BaseMetrics'),
	helpers = require('../helpers'),
	statistics = require('./util/statistics'),
	RenderingStats = require('./util/RenderingStats'),
	debug = require('debug')('bp:metrics:ChromeTracingMetrics');

function ChromeTracingMetrics() {
	BaseMetrics.apply(this, arguments);
	this.timelineMetrics = {};
	this.tracingStats = [];
}

require('util').inherits(ChromeTracingMetrics, BaseMetrics);

ChromeTracingMetrics.prototype.id = 'ChromeTracingMetrics';
ChromeTracingMetrics.prototype.probes = ['PerfLogProbe', 'AndroidTracingProbe'];

var TRACE_CATEGORIES = ['benchmark'];

ChromeTracingMetrics.prototype.setup = function(cfg) {
	cfg.browsers = cfg.browsers.map(function(browser) {
		if (browser.browserName && browser.browserName === 'chrome') {
			helpers.extend(browser, {
				chromeOptions: {
					perfLoggingPrefs: {}
				}
			});

			browser.chromeOptions.perfLoggingPrefs.traceCategories = [
				browser.chromeOptions.perfLoggingPrefs.traceCategories || '',
				TRACE_CATEGORIES
			].join();
		}
		return browser;
	});
	return Q(cfg);
};
ChromeTracingMetrics.prototype.onData = function(data) {
	if (data.type === 'perfLog') {
		this.tracingStats = [];
		var cat = new RegExp('\\b(' + TRACE_CATEGORIES.join('|') + '|__metadata)\\b');
		data.value.forEach(function(msg) {
			if (msg.method === 'Tracing.dataCollected' && cat.test(msg.params.cat)) {
				this.tracingStats.push(msg.params);
			}
		}, this);
	} else if (data.type === 'androidTracing') {
		this.tracingStats = data.value;
	}
	//require('fs').writeFileSync('_tracingMetrics.js', JSON.stringify(this.tracingStats));
};

ChromeTracingMetrics.prototype.getResults = function() {
	var results = {};
	if (this.tracingStats.length > 0) {
		var stats = new RenderingStats(this.tracingStats);
		this._ComputeFrameTimeMetric(stats, results);
		this._ComputeFrameTimeDiscrepancy(stats, results);
	} else {
		debug('No Tracing data found');
	}
	return results;
};

ChromeTracingMetrics.prototype._HasEnoughFrames = function(timestamps) {
	if (timestamps.length < 2) {
		debug('Does not have enough frames for computing tracing');
	}
	return timestamps.length >= 2;
};

/*
Returns Values for the frame time metrics.
This includes the raw and mean frame times, as well as the percentage of frames that were hitting 60 fps.
*/
ChromeTracingMetrics.prototype._ComputeFrameTimeMetric = function(stats, res) {
	if (this._HasEnoughFrames(stats.frame_timestamps)) {

		var smooth_threshold = 17.0;
		var smooth_count = stats.frame_times.filter(function(t) {
			return t < smooth_threshold;
		}).length;

		res.mean_frame_time = statistics.ArithmeticMean(stats.frame_times);
		res.percentage_smooth = smooth_count / stats.frame_times.length * 100.0;
		res.frames_per_sec = 1000 / res.mean_frame_time;
	}
};

// Returns a Value for the absolute discrepancy of frame time stamps
ChromeTracingMetrics.prototype._ComputeFrameTimeDiscrepancy = function(stats, res) {
	if (this._HasEnoughFrames(stats.frame_timestamps)) {
		res.frame_time_discrepancy = statistics.TimestampsDiscrepancy(stats.frame_timestamps);
	}
};

module.exports = ChromeTracingMetrics;