var Q = require('q'),
	helpers = require('./../helpers'),
	RuntimePerfMetrics = require('./util/RuntimePerfMetrics'),
	BaseMetrics = require('./BaseMetrics'),
	StatData = require('./util/StatData');

function TimelineMetrics() {
	this.timelineMetrics = {};
	this.runtimePerfMetrics = new RuntimePerfMetrics();
	BaseMetrics.apply(this, arguments);
}

require('util').inherits(TimelineMetrics, BaseMetrics);

TimelineMetrics.prototype.id = 'TimelineMetrics';
TimelineMetrics.prototype.probes = ['PerfLogProbe'];

TimelineMetrics.prototype.setup = function(cfg) {
	cfg.browsers = cfg.browsers.map(function(browser) {
		helpers.extend(browser, {
			chromeOptions: {
				perfLoggingPrefs: {
					enableTimeline: true
				}
			}
		});
		return browser;
	});
	return Q(cfg);
};

TimelineMetrics.prototype.getResults = function() {
	var res = this.runtimePerfMetrics.getResults();

	for (var key in this.timelineMetrics) {
		var stats = this.timelineMetrics[key].getStats();
		res[key] = stats.sum;
		res[key + '_avg'] = stats.mean;
		res[key + '_max'] = stats.max;
		res[key + '_count'] = stats.count;
	}

	return res;
};

TimelineMetrics.prototype.processRecord_ = function(record) {
	this.runtimePerfMetrics.processRecord(record);
	if (typeof record.endTime !== 'undefined' && typeof record.startTime !== 'undefined') {
		if (typeof this.timelineMetrics[record.type] === 'undefined') {
			this.timelineMetrics[record.type] = new StatData();
		}
		this.timelineMetrics[record.type].add(record.endTime - record.startTime);
	}

	if (Array.isArray(record.children)) {
		record.children.forEach(this.processRecord_.bind(this));
	}
};

TimelineMetrics.prototype.onData = function(data) {
	if (data.type === 'perfLog') {
		data.value.forEach(function(msg) {
			if (msg.method === 'Timeline.eventRecorded') {
				this.processRecord_(msg.params.record);
			}
		}.bind(this));
	}
};

module.exports = TimelineMetrics;