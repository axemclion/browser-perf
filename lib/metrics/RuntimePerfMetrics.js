// Test based on rules from http://calendar.perfplanet.com/2013/the-runtime-performance-checklist/
var StatData = require('./util/StatData'),
	BaseMetrics = require('./BaseMetrics'),
	helpers = require('../helpers');

function RuntimePerfMetrics() {
	BaseMetrics.apply(this, arguments);
	this.paintArea = new StatData();
	this.nodesPerLayout = new StatData();
	this.DirtyNodesPerLayout = new StatData();
	this.layers = {},
	this.expensivePaints = this.expensiveGC = 0, this.expensiveEventHandlers = 0;
}

require('util').inherits(RuntimePerfMetrics, BaseMetrics);

RuntimePerfMetrics.prototype.id = 'RuntimePerfMetrics';
RuntimePerfMetrics.prototype.probes = ['ChromeTimelineProbe'];

RuntimePerfMetrics.prototype.onData = function(data) {
	if (data.type === 'chrome.timeline' && typeof rules[data.value.type] === 'function') {
		rules[data.value.type].call(this, data.value);
	}
}

var rules = {
	FireAnimationFrame: function(event) {
		var fnCallTime = 0;
		if (Array.isArray(event.children)) {
			event.children.forEach(function(event) {
				if (event.type === 'GCEvent') {
					fnCallTime += event.endTime - event.startTime;
				}
			});
		}
		if (fnCallTime > 16) {
			this.expensiveGC++;
		}
	},
	EventDispatch: function(event) {
		var fnCallTime = 0;
		if (Array.isArray(event.children)) {
			event.children.forEach(function(event) {
				if (event.type === 'FunctionCall') {
					fnCallTime += event.endTime - event.startTime;
				}
			});
		}
		if (fnCallTime > 16) {
			this.expensiveEventHandlers++;
		}
	},
	Layout: function(event) {
		this.nodesPerLayout.add(event.data.totalObjects);
		this.DirtyNodesPerLayout.add(event.data.dirtyObjects);
	},
	Paint: function(event) {
		if (event.endTime - event.startTime > 16) {
			// This paint took more than 1/60 ms or 16 ms
			this.expensivePaints++;
		}
		this.layers[event.data.layerId] = true;
		var clip = event.data.clip;
		this.paintArea.add(Math.abs((clip[0] - clip[3]) * (clip[1] - clip[7])));
	}
}

RuntimePerfMetrics.prototype.getResults = function() {
	var paintAreaStat = this.paintArea.getStats();
	return {
		'Layers': helpers.metrics(Object.keys(this.layers).length, 'rendering', this.id, 'count', 2),
		'PaintedArea_total': helpers.metrics(paintAreaStat.sum, 'rendering', this.id, 'sq pixels', 2),
		'PaintedArea_avg': helpers.metrics(paintAreaStat.mean, 'rendering', this.id, 'sq pixels', 2),
		'NodePerLayout_avg': helpers.metrics(this.nodesPerLayout.getStats().mean, 'rendering', this.id, 'count', 2),
		'ExpensivePaints': helpers.metrics(this.expensivePaints, 'rendering', this.id, 'count', 2),
		'GCInsideAnimation': helpers.metrics(this.expensiveGC, 'rendering', this.id, 'count', 2),
		'ExpensiveEventHandlers': helpers.metrics(this.expensiveEventHandlers, 'rendering', this.id, 'count', 2)
	}
}

module.exports = RuntimePerfMetrics;