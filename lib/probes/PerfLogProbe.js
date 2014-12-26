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
			//require('fs').writeFileSync(__dirname + '/../../perflog.json', JSON.stringify(arg));
			return arg.map(function(x) {
				if (typeof x.message !== 'undefined') {
					// From ChromeDriver
					return JSON.parse(x.message).message;
				} else {
					// From Appium
					return {
						method: 'Timeline.eventRecorded',
						params: {
							record: x
						}
					}
				}
			}).filter(function(d) {
				return (typeof d !== 'undefined');
			});
		}).then(function(data) {
			me.emit('data', {
				type: 'perfLog',
				value: data
			});
		});
	}
};

module.exports = PerfLogProbe;