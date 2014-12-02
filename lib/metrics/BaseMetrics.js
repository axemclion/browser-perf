var Q = require('q');

function BaseMetric(cfg) {
	cfg = cfg || {};
	this.probes = cfg.probes || this.probes;
	if (!this.probes || !Array.isArray(this.probes)) {
		this.probes = [];
	}
	this.hrtime = process.hrtime();
	this.__data = [];
};

BaseMetric.prototype.getResults = function() {
	throw 'getResults not implemented for ' + this.id;
};

BaseMetric.prototype.onError = function(err) {

};

BaseMetric.prototype.onData = function(data) {
	this.hrtime = process.hrtime(this.hrtime);
	if (data) {
		data.__time = this.hrtime[0];
		this.__data.push(data);
	}
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