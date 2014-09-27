var BaseMetrics = require('./BaseMetrics'),
	StatData = require('./util/StatData');

function TimelineMetrics() {
	BaseMetrics.apply(this, arguments);
	this.timelineMetrics = {};
}

require('util').inherits(TimelineMetrics, BaseMetrics);

TimelineMetrics.prototype.id = 'TimelineMetrics';
TimelineMetrics.prototype.probes = ['ChromeTimelineProbe'];

TimelineMetrics.prototype.getResults = function() {
	var res = {};
	for (var key in this.timelineMetrics) {
		var stats = this.timelineMetrics[key].getStats();
		res[key] = stats.sum;
		res[key + '_avg'] = stats.mean;
		res[key + '_max'] = stats.max;
		res[key + '_count'] = stats.count;
	}
	return res;
};

TimelineMetrics.prototype.onData = function(data) {
	if (data.type === 'chrome.timeline' && typeof this.timelineMetrics[data.value.type] === 'undefined') {
		this.timelineMetrics[data.value.type] = new StatData();
	}
	this.timelineMetrics[data.value.type].add(data.value.endTime - data.value.startTime);
};

module.exports = TimelineMetrics;