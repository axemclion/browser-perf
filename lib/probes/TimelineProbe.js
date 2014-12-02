var util = require('util'),
	events = require('events'),
	Q = require('q'),
	helpers = require('../helpers'),
	debug = require('debug')('bp:probes:TimelineProbe');

function TimelineProbe() {
	events.EventEmitter.call(this);
}

util.inherits(TimelineProbe, events.EventEmitter);

TimelineProbe.prototype.id = 'TimelineProbe';

TimelineProbe.prototype.setup = function(cfg) {
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

TimelineProbe.prototype.start = function(browser) {
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

TimelineProbe.prototype.teardown = function(browser) {
	if (this.enabled) {
		var me = this;
		return browser.log('performance').then(function(arg) {
			debug('Got Performance timeline results');
			return arg.map(function(x) {
				if (typeof x.message !== 'undefined') {
					var message = JSON.parse(x.message).message;
					if (typeof message.params !== 'undefined' && typeof message.params.record !== 'undefined') {
						return message.params.record;
					}
				} else {
					return x;
				}
			}).filter(function(d) {
				return (typeof d !== 'undefined');
			});
		}).then(function(data) {
			//require('fs').writeFileSync(__dirname + '/../../timeline.json', JSON.stringify(data));
			me.emit('data', {
				type: 'timeline',
				browser: 'chrome',
				value: data
			});
		});
	}
};

module.exports = TimelineProbe;