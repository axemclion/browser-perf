// Test based on rules from http://calendar.perfplanet.com/2013/the-runtime-performance-checklist/
var StatData = require('./StatData');

function RuntimePerfMetrics() {
	this.paintArea = new StatData();
	this.nodesPerLayout = new StatData();
	this.DirtyNodesPerLayout = new StatData();
	this.layers = {};
	this.expensivePaints = this.expensiveGC = 0, this.expensiveEventHandlers = 0;

	this.hasData = false;
}


RuntimePerfMetrics.prototype.id = 'RuntimePerfMetrics';

RuntimePerfMetrics.prototype.processRecord = function(record) {
	if (typeof rules[record.type] === 'function') {
		this.hasData = true;
		rules[record.type].call(this, record);
	}
};

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
	if (this.hasData) {
		return {
			'Layers': Object.keys(this.layers).length,
			'PaintedArea_total': paintAreaStat.sum,
			'PaintedArea_avg': paintAreaStat.mean,
			'NodePerLayout_avg': this.nodesPerLayout.getStats().mean,
			'ExpensivePaints': this.expensivePaints,
			'GCInsideAnimation': this.expensiveGC,
			'ExpensiveEventHandlers': this.expensiveEventHandlers
		}
	} else {
		return {};
	}
}

module.exports = RuntimePerfMetrics;