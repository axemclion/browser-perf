var BaseMetrics = require('./BaseMetrics'),
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
		res[key] = helpers.metrics(this.timelineMetrics[key].sum, 'rendering', this.id, 'ms', 0);
		res[key + '_avg'] = helpers.metrics(this.timelineMetrics[key].sum / this.timelineMetrics[key].count, 'rendering', this.id, 'ms', 2);
		res[key + '_max'] = helpers.metrics(this.timelineMetrics[key].max, 'rendering', this.id, 'ms', 1);
		res[key + '_count'] = helpers.metrics(this.timelineMetrics[key].count, 'rendering', this.id, 'count', 1);
	}
	return res;
};

ChromeTimelineMetrics.prototype.onData = function(data) {
	if (typeof this.timelineMetrics[data.method] === 'undefined') {
		this.timelineMetrics[data.method] = {
			count: 0,
			max: 0,
			sum: 0
		};
	}
	this.timelineMetrics[data.method].count = this.timelineMetrics[data.method].count + 1;
	this.timelineMetrics[data.method].sum = this.timelineMetrics[data.method].sum + data.time;
	if (this.timelineMetrics[data.method].max < data.time) {
		this.timelineMetrics[data.method].max = data.time;
	}
};

module.exports = ChromeTimelineMetrics;