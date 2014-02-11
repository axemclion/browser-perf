var Q = require('q'),
	helpers = require('../helpers'),
	log = helpers.log();

function BaseMetric(cfg) {
	cfg = cfg || {};
	this.probes = cfg.probes || this.probes;
	if (!this.probes || !Array.isArray(this.probes)) {
		this.probes = [];
	}
	this.hrtime = process.hrtime();
	this.__data = [];
};

function promise(method) {
	return function() {
		log.debug('[Metric]: ' + this.id + '.' + method);
		var args = arguments;
		return Q.allSettled(this.activeProbes.map(function(probe) {
			if (typeof probe[method] === 'function') {
				log.debug('[Probe]:' + probe.id + '.' + method);
				return probe[method].apply(probe, args);
			} else {
				return Q();
			}
		}));
	}
}

BaseMetric.prototype.setup = function(cfg) {
	var me = this;
	this.activeProbes = helpers.initConstructors(this.probes, 'probes/', cfg);
	this.activeProbes.forEach(function(probe) {
		log.debug('Adding event handlers for probes for ' + me.id);
		probe.on('data', me.onData.bind(me));
		probe.on('error', me.onError.bind(me));
	});
	return promise('setup').apply(this, arguments);
};

BaseMetric.prototype.teardown = promise('teardown');
BaseMetric.prototype.start = promise('start');
BaseMetric.prototype.getResults = function() {
	return this.__getDeltas();
}

BaseMetric.prototype.onError = function(err) {

};

BaseMetric.prototype.onData = function(data) {
	this.hrtime = process.hrtime(this.hrtime);
	data.__time = this.hrtime[0];
	this.__data.push(data);
};

var difference = function(a, b) {
	if (typeof a !== typeof b) {
		return NaN;
	}
	if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
		return a.map(function(el, i) {
			return el - b[i];
		});
	} else if (typeof a === 'object') {
		var diff = {};
		for (var key in a) {
			diff[key] = difference(a[key], b[key]);
		}
		return diff;
	} else {
		return a - b;
	}
}

BaseMetric.prototype.__getDeltas = function() {
	var deltas = [];
	if (this.__data.length === 1) {
		return this.__data[0];
	}
	for (var i = 1; i < this.__data.length; i++) {
		var x = difference(this.__data[i], this.__data[i - 1]);
		deltas.push(x);
	}
	return (deltas.length === 1 ? deltas[0] : deltas);
};

module.exports = BaseMetric;