var Q = require('q'),
	util = require('util'),
	events = require('events'),
	helpers = require('../helpers'),
	log = helpers.log();

function SampleProbe() {
	log.debug('[Sample Probe]: Initialize');
	events.EventEmitter.call(this);
}

util.inherits(SampleProbe, events.EventEmitter);

SampleProbe.prototype.id = 'SampleProbe';

SampleProbe.prototype.setup = function(cfg) {
	log.debug('[Sample Probe]: Setup');
	this.timerHandle = null;
	return Q.delay(1);
};

SampleProbe.prototype.start = function(cfg, browser) {
	log.debug('[Sample Probe]: start');
	var me = this;
	this.timerHandle = setInterval(function() {
		log.debug('[Sample Probe]: Event fired');
		me.emit('data', {
			time: new Date().getTime()
		});
	});
	return Q.delay(1);
};

SampleProbe.prototype.teardown = function(cfg, browser) {
	log.debug('[Sample Probe]: teardown');
	clearInterval(this.timerHandle);
	return Q.delay(1);
};

module.exports = SampleProbe;