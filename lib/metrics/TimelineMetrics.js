var Q = require('q'),
    helpers = require('./../helpers'),
    RuntimePerfMetrics = require('./util/RuntimePerfMetrics'),
    BaseMetrics = require('./BaseMetrics'),
    StatData = require('./util/StatData'),
    debug = require('debug')('bp:metrics:TimelineMetrics');

function TimelineMetrics() {
    this.timelineMetrics = {};
    this.runtimePerfMetrics = new RuntimePerfMetrics();
    this.eventStacks = {};

    BaseMetrics.apply(this, arguments);
}

require('util').inherits(TimelineMetrics, BaseMetrics);

TimelineMetrics.prototype.id = 'TimelineMetrics';
TimelineMetrics.prototype.probes = ['PerfLogProbe', 'AndroidTracingProbe'];

var TRACE_CATEGORIES = ['blink.console', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel', 'disabled-by-default-devtools.timeline.frame'];
var eventCategoryRegEx = new RegExp('\\b(' + TRACE_CATEGORIES.join('|') + '|__metadata)\\b');

TimelineMetrics.prototype.setup = function(cfg) {
    cfg.browsers = cfg.browsers.map(function(browser) {
        helpers.extend(browser, {
            chromeOptions: {
                perfLoggingPrefs: {}
            }
        });

        if (helpers.deepEquals(browser, 'browserName', 'chrome') ||
            (helpers.deepEquals(browser, 'browserName', 'android') && !helpers.deepEquals(browser, 'chromeOptions.androidPackage', 'com.android.chrome'))) {
            // Only add this for Chrome OR Android-hybrid, not for Android-Chrome
            browser.chromeOptions.perfLoggingPrefs.traceCategories = [
                browser.chromeOptions.perfLoggingPrefs.traceCategories || '',
                TRACE_CATEGORIES
            ].join();
        }
        return browser;
    });
    return Q(cfg);
};


TimelineMetrics.prototype.getResults = function() {
    var res = {};

    for (var key in this.timelineMetrics) {
        var stats = this.timelineMetrics[key].getStats();
        if (stats.sum === 0) {
            res[key] = stats.count;
        } else {
            res[key] = stats.sum;
            res[key + '_avg'] = stats.mean;
            res[key + '_max'] = stats.max;
            res[key + '_count'] = stats.count;
        }
    }

    helpers.extend(res, this.runtimePerfMetrics.getResults());

    return this.addAggregates_(res);
};

TimelineMetrics.prototype.addAggregates_ = function(res) {
    var metrics = {
        'Styles': ['UpdateLayoutTree', 'RecalculateStyles', 'ParseAuthorStyleSheet'],
        'Javascript': ['FunctionCall', 'GCEvent', 'MajorGC', 'MinorGC', 'EvaluateScript']
    }
    for (var key in metrics) {
        res[key] = metrics[key].reduce(function(prev, cur, i) {
            return prev + (typeof res[cur] === 'number' ? res[cur] : 0);
        }, 0);
    }
    return res
}

// Data from Safari/Appium (old format)
TimelineMetrics.prototype.processTimelineRecord_ = function(e) {
    this.addData_(e, 'timeline');

    if (Array.isArray(e.children)) {
        e.children.forEach(this.processTimelineRecord_.bind(this));
    }
};

// Timeline format at https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit#heading=h.yr4qxyxotyw
TimelineMetrics.prototype.processTracingRecord_ = function(e) {
    switch (e.ph) {
        case 'I': // Instant Event
        case 'X': // Duration Event
            var duration = e.dur || e.tdur || 0;
            this.addData_({
                type: e.name,
                data: e.args ? e.args.data : {},
                startTime: e.ts / 1000,
                endTime: (e.ts + duration) / 1000
            }, 'tracing');
            break;
        case 'B': // Begin Event
            if (typeof this.eventStacks[e.tid] === 'undefined') {
                this.eventStacks[e.tid] = [];
            }
            this.eventStacks[e.tid].push(e);
            break;
        case 'E': // End Event
            if (typeof this.eventStacks[e.tid] === 'undefined' || this.eventStacks[e.tid].length === 0) {
                debug('Encountered an end event that did not have a start event', e);
            } else {
                var b = this.eventStacks[e.tid].pop();
                if (b.name !== e.name) {
                    debug('Start and end events dont have the same name', e, b);
                }
                this.addData_({
                    type: e.name,
                    data: helpers.extend(e.args.endData, b.args.beginData),
                    startTime: b.ts / 1000,
                    endTime: e.ts / 1000
                }, 'tracing');
            }
            break;
    }
};

TimelineMetrics.prototype.addData_ = function(e, source) {
    if (typeof this.timelineMetrics[e.type] === 'undefined') {
        this.timelineMetrics[e.type] = new StatData();
    }
    this.timelineMetrics[e.type].add(e.startTime && e.endTime ? e.endTime - e.startTime : 0);
    this.runtimePerfMetrics.processRecord(e, source);
}

TimelineMetrics.prototype.onData = function(data) {
    if (data.type === 'perfLog') {
        var msg = data.value;
        if (msg.method === 'Timeline.eventRecorded') {
            this.processTimelineRecord_(msg.params);
        } else if (msg.method === 'Tracing.dataCollected') {
            if (eventCategoryRegEx.test(msg.params.cat)) {
                this.processTracingRecord_(msg.params);
            }
        }
    } else if (data.type === 'androidTracing') {
        msg = data.value;
        if (eventCategoryRegEx.test(msg.cat)) {
            this.processTracingRecord_(msg);
        }
    }
};

module.exports = TimelineMetrics;
