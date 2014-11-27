var BaseMetrics = require('./BaseMetrics'),
	StatData = require('./util/StatData');

function TimelineMetrics() {
	BaseMetrics.apply(this, arguments);
}

require('util').inherits(TimelineMetrics, BaseMetrics);

TimelineMetrics.prototype.id = 'TimelineMetrics';
TimelineMetrics.prototype.probes = ['TimelineProbe'];

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
	if (data.type !== 'timeline') {
		return;
	}
	var timelineMetrics = {};
	(function processRecursively(data) {
		data.forEach(function(d) {
			if (typeof d.endTime !== 'undefined' && typeof d.startTime !== 'undefined') {
				if (typeof timelineMetrics[d.type] === 'undefined') {
					timelineMetrics[d.type] = new StatData();
				}
				timelineMetrics[d.type].add(d.endTime - d.startTime);
			}
			if (Array.isArray(d.children)) {
				processRecursively(d.children);
			}
		});
	}(data.value));
	this.timelineMetrics = timelineMetrics;
};

module.exports = TimelineMetrics;