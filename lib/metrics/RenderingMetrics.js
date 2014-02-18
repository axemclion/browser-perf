var BaseMetrics = require('./BaseMetrics');

function RenderingMetrics() {
	BaseMetrics.apply(this, arguments);
	this.timelineMetrics = {};
}
require('util').inherits(RenderingMetrics, BaseMetrics);

RenderingMetrics.prototype.id = 'RenderingMetrics';
RenderingMetrics.prototype.probes = ['ChromeExtensionProbe'];

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
		this.timelineMetrics[data.method] = {};
	}
	this.timelineMetrics[data.method].count++;
	var time = data.end - data.start;
	this.timelineMetrics[data.method].sum = time;
	(this.timelineMetrics[data.method].max < time) && (this.timelineMetrics[data.method].max = time);
};

function chromeTracing(data) {
	//	require('fs').writeFileSync('./test/res/tracing.json', JSON.stringify(data));
};

module.exports = RenderingMetrics;