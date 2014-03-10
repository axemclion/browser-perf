var BaseMetrics = require('./BaseMetrics'),
	StatData = require('./util/StatData'),
	helpers = require('../helpers');

function ChromeTimelineMetrics() {
	BaseMetrics.apply(this, arguments);
	this.timelineMetrics = {};
}

require('util').inherits(ChromeTimelineMetrics, BaseMetrics);

ChromeTimelineMetrics.prototype.id = 'ChromeTimelineMetrics';
ChromeTimelineMetrics.prototype.probes = ['ChromeTimelineProbe'];

ChromeTimelineMetrics.prototype.getResults = function() {
	var res = {};
	for (var key in this.timelineMetrics) {
		var stats = this.timelineMetrics[key].getStats();
		res[key] = helpers.metrics(stats.sum, 'rendering', this.id, 'ms', 0);
		res[key + '_avg'] = helpers.metrics(stats.mean, 'rendering', this.id, 'ms', 2);
		res[key + '_max'] = helpers.metrics(stats.max, 'rendering', this.id, 'ms', 1);
		res[key + '_count'] = helpers.metrics(stats.count, 'rendering', this.id, 'count', 1);
	}
	return res;
};

ChromeTimelineMetrics.prototype.onData = function(data) {
	if (data.type === 'chrome.timeline' && typeof this.timelineMetrics[data.type] === 'undefined') {
		this.timelineMetrics[data.type] = new StatData();
	}
	this.timelineMetrics[data.type].add(data.endTime - data.startTime)
};

module.exports = ChromeTimelineMetrics;