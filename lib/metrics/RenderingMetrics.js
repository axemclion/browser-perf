var BaseMetrics = require('./BaseMetrics'),
	helpers = require('../helpers'),
	TracingMetrics = require('./util/TracingMetrics');

function RenderingMetrics() {
	BaseMetrics.apply(this, arguments);
	this.timelineMetrics = {};
	this.tracingStats = [];
}
require('util').inherits(RenderingMetrics, BaseMetrics);

RenderingMetrics.prototype.id = 'RenderingMetrics';
RenderingMetrics.prototype.probes = ['ChromeExtensionProbe'];

RenderingMetrics.prototype.getResults = function() {
	var res = {};
	for (var key in this.timelineMetrics) {
		res[key] = helpers.metrics(this.timelineMetrics[key].sum, 'rendering', this.id, 'ms', 0);
		res[key + '_avg'] = helpers.metrics(this.timelineMetrics[key].sum / this.timelineMetrics[key].count, 'rendering', this.id, 'ms', 2);
		res[key + '_max'] = helpers.metrics(this.timelineMetrics[key].max, 'rendering', this.id, 'ms', 1);
		res[key + '_count'] = helpers.metrics(this.timelineMetrics[key].count, 'rendering', this.id, 'count', 1);
	}
	if (this.tracingStats.length > 0) {
		var tracingMetrics = new TracingMetrics(this.tracingStats);
		tracingMetrics.addData(res);
	}
	return res;
};

RenderingMetrics.prototype.onData = function(data) {
	if (typeof this.parseData[data.type] === 'function') {
		this.parseData[data.type].call(this, data.value);
	}
};
RenderingMetrics.prototype.parseData = {
	'chrome.timeline': chromeTimeline,
	'chrome.tracing': chromeTracing
};

function chromeTimeline(data) {
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

function chromeTracing(data) {
	this.tracingStats.push(data);
};

module.exports = RenderingMetrics;