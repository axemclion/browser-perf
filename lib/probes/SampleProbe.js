var Q = require('q'),
	util = require('util'),
	events = require('events'),
	helpers = require('../helpers'),
	debug = require('debug')('bp:probes:SampleProbe');

function SampleProbe(id) {
	if (id) {
		this.id = id;
	}
	debug('Initialize');
	events.EventEmitter.call(this);
}

util.inherits(SampleProbe, events.EventEmitter);

SampleProbe.prototype.id = 'SampleProbe';

SampleProbe.prototype.setup = function(cfg) {
	debug('Setup');
	this.timerHandle = null;
	return Q.delay(1);
};

SampleProbe.prototype.start = function(cfg, browser) {
	debug('start');
	var me = this;
	this.timerHandle = setInterval(function() {
		debug('Event fired');
		me.emit('data', {
			time: new Date().getTime()
		});
	});
	return Q.delay(1);
};

SampleProbe.prototype.teardown = function(cfg, browser) {
	debug('teardown');
	clearInterval(this.timerHandle);
	return Q.delay(1);
};

module.exports = SampleProbe;