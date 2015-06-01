var Q = require('q'),
    util = require('util'),
    wd = require('wd'),
    events = require('events'),
    helpers = require('../helpers');

/**
 * Network resources timing Probe
 *
 * @see http://www.w3.org/TR/resource-timing/
 * @constructor
 */
function NetworkResourcesProbe() {

    /**
     * "outputRawData" config option to decide whether or not Metric should return raw data
     *
     * "resultsBeforeStart" window.performance.getEntries() track all resources, even before browser-perf is started.
     * With this option, metric could return all ("true") results or only between Probe "start" and "teardown" ("false")
     *
     * @type {{outputRawData: boolean, resultsBeforeStart: boolean}}
     */
    this.defaultOptions = {
        'outputRawData' : false,
        'resultsBeforeStart' : false
    };

    this.lastResourceTime = 0;

    events.EventEmitter.call(this);
}

util.inherits(NetworkResourcesProbe, events.EventEmitter);

NetworkResourcesProbe.prototype.id = 'NetworkResourcesProbe';

/**
 * Client-side script that need to be executed
 * inside browser to get Network Resources statistics
 *
 * @private
 */
NetworkResourcesProbe.prototype._clientGetData = function() {
    window.__networkResources = (window.performance && typeof window.performance.getEntries == 'function')
        ? window.performance.getEntries()
        : [];
};

NetworkResourcesProbe.prototype.setup = function(config) {
    var options = config.metricOptions['NetworkResources'] || {};
    this.options = helpers.extend(this.defaultOptions, options);
};

/**
 * Called on metrics.stats
 *
 * @param browser
 */
NetworkResourcesProbe.prototype.start = function(browser) {
    var me = this;

    // Execute window.performance.getEntries() to get resources
    // that were before fetched before browser-perf metrics started
    // and calculate last loaded resource
    browser.execute(helpers.fnCall(this._clientGetData))
        .then(function() {
            return browser.eval('window.__networkResources')
        })
        .then(function(res) {
            me.beforeData = res;

            // If "resultsBeforeStart" option is false and there are any information
            if (!me.options.resultsBeforeStart &&  me.beforeData && me.beforeData.length > 0) {
                me.lastResourceTime = me.beforeData[me.beforeData.length - 1]['responseEnd'];
            }
        });
};

/**
 * Called on metrics.teardown
 *
 * @param browser
 * @returns {*}
 */
NetworkResourcesProbe.prototype.teardown = function(browser) {
    var me = this;
    return browser.execute(helpers.fnCall(this._clientGetData))
        .then(function() {
            return browser.eval('window.__networkResources')
        })
        .then(function(res) {
            // filter results to starts with this.lastResourceTime
            return res.filter(function(element) {
                return element['startTime'] >= me.lastResourceTime
            });
        })
        .then(function(res) {
            me.emit('data', res);
        });
};
module.exports = NetworkResourcesProbe;
