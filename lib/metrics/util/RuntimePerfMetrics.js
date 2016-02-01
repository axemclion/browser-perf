// Test based on rules from http://calendar.perfplanet.com/2013/the-runtime-performance-checklist/
var StatData = require('./StatData');

function RuntimePerfMetrics() {
    this.paintArea = new StatData();
    this.nodesPerLayout = new StatData();
    this.DirtyNodesPerLayout = new StatData();
    this.layers = {};
    this.expensivePaints = 0;
    this.expensiveEventHandlers = 0;
    this.styles = 0;

    this.hasData = false;
    this.eventDispatchFn = null; // To check if FunctionCall follows EventDispatch events

    this.frames = [];
}


RuntimePerfMetrics.prototype.id = 'RuntimePerfMetrics';

RuntimePerfMetrics.prototype.processRecord = function(record, source) {
    // If eventDispatch is ticking and this is not a FunctionCall, restart the ticks
    if (source === 'tracing' && this.eventDispatchFn !== null && record.type !== 'FunctionCall') {
        if (this.eventDispatchFn > 16) {
            this.expensiveEventHandlers++;
        }
        this.eventDispatchFn = null;
    }

    if (typeof rules[record.type] === 'function') {
        this.hasData = true;
        rules[record.type].apply(this, [record, source]);
    }
};

var rules = {
    DrawFrame: function(event) {
        this.frames.push(event.startTime);
    },
    EventDispatch: function(event) {
        var fnCallTime = 0;
        this.eventDispatchFn = 0; // start ticking eventDispatchFn 
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
    FunctionCall: function(event, source) {
        if (source === 'tracing' && this.eventDispatchFn !== null) {
            // Looks like a function call after eventDispatch since eventDispatchFn is ticking
            this.eventDispatchFn += (event.endTime - event.startTime);
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

function getFrameRate(frames) {
    frames.sort();
    var range = 0.20;
    var start = parseInt(frames.length * range, 10);
    var end = parseInt(frames.length * (1 - range), 10);
    return (1000 * (end - start)) / (frames[end] - frames[start]);
}

RuntimePerfMetrics.prototype.getResults = function() {
    if (this.eventDispatchFn !== null) {
        // Last event on the chain is a Function call, so draining it
        this.processRecord({}, 'tracing');
    }

    var paintAreaStat = this.paintArea.getStats();
    if (this.hasData) {
        return {
            'Layers': Object.keys(this.layers).length,
            'PaintedArea_total': paintAreaStat.sum,
            'PaintedArea_avg': paintAreaStat.mean,
            'NodePerLayout_avg': this.nodesPerLayout.getStats().mean,
            'ExpensivePaints': this.expensivePaints,
            'ExpensiveEventHandlers': this.expensiveEventHandlers,
            'framesPerSec (devtools)': getFrameRate(this.frames)
        }
    } else {
        return {};
    }
}

module.exports = RuntimePerfMetrics;
