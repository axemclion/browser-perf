var Q = require('q'),
	util = require('util'),
	events = require('events'),
	helpers = require('../helpers'),
	debug = require('debug')('bp:probes:MemoryProbe');

function MemoryProbe(id) {
	if (id) {
		this.id = id;
	}
	events.EventEmitter.call(this);
}

util.inherits(MemoryProbe, events.EventEmitter);

MemoryProbe.prototype.id = 'MemoryProbe';

MemoryProbe.prototype.setup = function(cfg) {
	this.timerHandle = null;
};

MemoryProbe.prototype.start = function(browser) {
	var me = this;
	this.timerHandle = setInterval(function() {
		browser.eval('window.performance.memory').then(function(res) {
			if(res) {
				me.emit('data', res);
			}
		});
	}, 50);
};

MemoryProbe.prototype.teardown = function(cfg, browser) {
	clearInterval(this.timerHandle);
};

module.exports = MemoryProbe;
