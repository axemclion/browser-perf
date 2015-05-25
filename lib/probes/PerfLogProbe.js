var util = require('util'),
	events = require('events'),
	Q = require('q'),
	helpers = require('../helpers'),
	debug = require('debug')('bp:probes:PerfLogProbe');

function PerfLogProbe() {
	events.EventEmitter.call(this);
}

util.inherits(PerfLogProbe, events.EventEmitter);

PerfLogProbe.prototype.id = 'PerfLogProbe';

PerfLogProbe.prototype.setup = function(cfg) {
	var me = this;
	cfg.browsers = cfg.browsers.map(function(browser) {
		helpers.extend(browser, {
			loggingPrefs: {
				performance: 'ALL'
			}
		});
		return browser;
	});
	return Q(cfg);
};

PerfLogProbe.prototype.start = function(browser) {
	var me = this;
	return browser.logTypes().then(function(logs) {
		debug('Supported log types', logs);
		me.enabled = (logs.indexOf('performance') !== -1);
	}).then(function() {
		if (me.enabled) {
			return browser.log('performance');
		}
	});
};

PerfLogProbe.prototype.teardown = function(browser) {
	if (this.enabled) {
		var me = this;
		return browser.log('performance').then(function(arg) {
			debug('Got Performance log results');
			//require('fs').writeFileSync('_perflog.json', JSON.stringify(arg));
			arg.forEach(function(x, i) {
				if (typeof x.message !== 'undefined') {
					// ChromeDriver - format: message: "[{method:'Tracing.dataCollected', params:{cat:...,pid:...}}]"
					arg[i] = JSON.parse(x.message).message;
				} else {
					// Appium - format: [{startTime:..., name:..., endTime:...}]
					arg[i] = {
						method: 'Timeline.eventRecorded',
						params: x
					}
				}
			});
			return arg;
		}).then(function(data) {
			me.emit('data', {
				type: 'perfLog',
				value: data
			});
		});
	}
};

module.exports = PerfLogProbe;