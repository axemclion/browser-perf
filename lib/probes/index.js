var Q = require('q'),
	helpers = require('../helpers'),
	log = helpers.log();

function ProbeManager() {
	this.probes = {};
}

ProbeManager.prototype.addProbes = function(metric) {
	var me = this;
	metric.probes = metric.probes || [];
	metric.probes.forEach(function(probe) {
		if (typeof probe === 'string') {

			if (typeof me.probes[probe] === 'object') {
				probe = me.probes[probe];
			} else {
				var fn = require('./' + probe);
				probe = new fn();
			}
		}

		if (typeof probe !== 'object' || typeof probe.id === 'undefined') {
			throw 'Probe needs to be an object and is ' + typeof probes + ' and should have an id';
		}
		if (typeof me.probes[probe.id] === 'undefined') {
			me.probes[probe.id] = probe;
		}
		log.debug('[Probes]: Registering probe', probe.id);
		(typeof metric.onData === 'function') && probe.on('data', metric.onData.bind(metric));
		(typeof metric.onError === 'function') && probe.on('error', metric.onError.bind(metric));
	});
};

function promise(method) {
	return function() {
		var args = arguments,
			me = this;
		log.debug('[Probes]: ' + method);
		return Object.keys(this.probes).map(function(probeKey) {
			return function() {
				probe = me.probes[probeKey];
				log.debug('[Probe]: ', probe.id, method, typeof probe[method] !== 'undefined' ? 'called' : 'not called');
				if (typeof probe[method] === 'function') {
					return probe[method].apply(probe, args);
				} else {
					return Q();
				}
			}
		}).reduce(Q.when, Q());
	}
}

ProbeManager.prototype.setup = promise('setup');
ProbeManager.prototype.start = promise('start');
ProbeManager.prototype.teardown = promise('teardown');
module.exports = ProbeManager;