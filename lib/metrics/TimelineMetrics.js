var Q = require('q'),
	helpers = require('./../helpers'),
	RuntimePerfMetrics = require('./util/RuntimePerfMetrics'),
	BaseMetrics = require('./BaseMetrics'),
	StatData = require('./util/StatData'),
	debug = require('debug')('bp:metrics:TimelineMetrics');;

function TimelineMetrics() {
	this.timelineMetrics = {};
	this.runtimePerfMetrics = new RuntimePerfMetrics();

	this.eventStacks = {};

	BaseMetrics.apply(this, arguments);
}

require('util').inherits(TimelineMetrics, BaseMetrics);

TimelineMetrics.prototype.id = 'TimelineMetrics';
TimelineMetrics.prototype.probes = ['PerfLogProbe', 'AndroidTracingProbe'];

var TRACE_CATEGORIES = ['blink.console', 'disabled-by-default-devtools.timeline'];

TimelineMetrics.prototype.setup = function(cfg) {
	cfg.browsers = cfg.browsers.map(function(browser) {
		helpers.extend(browser, {
			chromeOptions: {
				perfLoggingPrefs: {}
			}
		});

		if (helpers.deepEquals(browser, 'browserName', 'chrome') ||
			(helpers.deepEquals(browser, 'browserName', 'android') && !helpers.deepEquals(browser, 'chromeOptions.androidPackage', 'com.android.chrome'))) {
			// Only add this for Chrome OR Android-hybrid, not for Android-Chrome
			browser.chromeOptions.perfLoggingPrefs.traceCategories = [
				browser.chromeOptions.perfLoggingPrefs.traceCategories || '',
				TRACE_CATEGORIES
			].join();
		}
		return browser;
	});
	return Q(cfg);
};


TimelineMetrics.prototype.getResults = function() {
	var res = this.runtimePerfMetrics.getResults();

	for (var key in this.timelineMetrics) {
		var stats = this.timelineMetrics[key].getStats();
		if (stats.sum === 0) {
			res[key] = stats.count;
		} else {
			res[key] = stats.sum;
			res[key + '_avg'] = stats.mean;
			res[key + '_max'] = stats.max;
			res[key + '_count'] = stats.count;
		}
	}

	return res;
};

TimelineMetrics.prototype.processTimelineRecord_ = function(e) {
	this.runtimePerfMetrics.processRecord(e);
	this.addData_(e.type, e.startTime && e.endTime ? e.endTime - e.startTime : 0);

	if (Array.isArray(e.children)) {
		e.children.forEach(this.processTimelineRecord_.bind(this));
	}
};

// Timeline format at https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit#heading=h.yr4qxyxotyw
TimelineMetrics.prototype.processTracingRecord_ = function(e) {
	switch (e.ph) {
		case 'I': // Instant Event
		case 'X': // Duration Event
			var duration = e.dur || e.tdur || 0;
			this.addData_(e.name, duration / 1000);
			this.runtimePerfMetrics.processRecord({
				type: e.name,
				data: e.args ? e.args.data : {},
				startTime: e.ts / 1000,
				endTime: (e.ts + duration) / 1000
			}, 'tracing');
			break;
		case 'B': // Begin Event
			if (typeof this.eventStacks[e.tid] === 'undefined') {
				this.eventStacks[e.tid] = [];
			}
			this.eventStacks[e.tid].push(e);
			break;
		case 'E': // End Event
			if (typeof this.eventStacks[e.tid] === 'undefined' || this.eventStacks[e.tid].length === 0) {
				debug('Encountered an end event that did not have a start event', e);
			} else {
				var b = this.eventStacks[e.tid].pop();
				if (b.name !== e.name) {
					debug('Start and end events dont have the same name', e, b);
				}
				this.addData_(e.name, (e.ts - b.ts) / 1000);
				this.runtimePerfMetrics.processRecord({
					type: e.name,
					data: helpers.extend(e.args.endData, b.args.beginData),
					startTime: b.ts / 1000,
					endTime: e.ts / 1000
				}, 'tracing');
			}
			break;
	}
};

TimelineMetrics.prototype.addData_ = function(name, duration) {
	if (typeof this.timelineMetrics[name] === 'undefined') {
		this.timelineMetrics[name] = new StatData();
	}
	this.timelineMetrics[name].add(duration);
}

TimelineMetrics.prototype.onData = function(data) {
	var cat = new RegExp('\\b(' + TRACE_CATEGORIES.join('|') + '|__metadata)\\b');
	if (data.type === 'perfLog') {
		data.value.forEach(function(msg) {
			if (msg.method === 'Timeline.eventRecorded') {
				this.processTimelineRecord_(msg.params);
			} else if (msg.method === 'Tracing.dataCollected' && cat.test(msg.params.cat)) {
				this.processTracingRecord_(msg.params);
			}
		}, this);
	} else if (data.type === 'androidTracing') {
		data.value.forEach(function(msg) {
			if (cat.test(msg.cat)) {
				this.processTracingRecord_(msg);
			}
		}, this);
	}
};

module.exports = TimelineMetrics;