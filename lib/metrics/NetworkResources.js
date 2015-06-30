var BaseMetrics = require('./BaseMetrics'),
    helpers = require('../helpers'),
    StatData = require('./util/StatData'),
    Q = require('q');

function NetworkResources() {

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

    // Initialize result statistics object
    this.stats = {};

    // Check http://www.w3.org/TR/resource-timing/ for available types
    this.typesMapping = {
        'subdocument' : 'iframe',
        'iframe' : 'iframe',
        'img' : 'image',
        'link' : 'css',
        'script' : 'js',
        'css' : 'image', //mean resource is loaded from CSS file
        'xmlhttprequest' : 'xhrrequest'
    };

    BaseMetrics.apply(this, arguments);
}
require('util').inherits(NetworkResources, BaseMetrics);

NetworkResources.prototype.id = 'NetworkResources';
NetworkResources.prototype.probes = ['NetworkResourcesProbe'];

/**
 * Metrics setup
 * Extend default configuration options
 *
 * @param config
 * @returns {*}
 */
NetworkResources.prototype.setup = function (config) {
    var options = config.metricOptions[this.id] || {};
    this.options = helpers.extend(this.defaultOptions, options);

    return Q(config);
};

NetworkResources.prototype.onData = function(data) {
    this.resources = data;
    this.resources.forEach(function(element) {
        // Process only "resource" type results, so we do not add "marks" and "measures" into StatData
        if (element['entryType'] && element['entryType'] === 'resource') {
            this.addData(element);
        }
    }, this);
};

/**
 * Calculate type based on resource properties and add it to stats
 *
 * @param row
 */
NetworkResources.prototype.addData = function(row) {

    var type = this.typesMapping[row['initiatorType']] || 'other';
    var statsKey = 'Network' + type[0].toUpperCase() + type.slice(1);

    if (typeof this.stats[statsKey] === 'undefined') {
        this.stats[statsKey] = new StatData();
    }

    this.stats[statsKey].add(row['duration']);
};

/**
 * Calculate results for Networking Resources usage
 *
 * @returns {object}
 */
NetworkResources.prototype.getResults = function() {

    var result = {};

    for (var key in this.stats) {
        var stats = this.stats[key].getStats();
        if (stats.sum === 0) {
            result[key] = stats.count;
        } else {
            result[key] = stats.sum;
            result[key + '_avg'] = stats.mean;
            result[key + '_max'] = stats.max;
            result[key + '_count'] = stats.count;
        }
    }

    if (this.options.outputRawData) {
        result['NetworkRawData'] = this.resources || [];
    }

    return result;
};

module.exports = NetworkResources;
