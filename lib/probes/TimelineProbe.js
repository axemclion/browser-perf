var util = require('util'),
	events = require('events'),
	Q = require('q'),
	helpers = require('../helpers'),
	log = helpers.log('ChromeTimelineProbe');

function ChromeTimelineProbe() {
	events.EventEmitter.call(this);
}

util.inherits(ChromeTimelineProbe, events.EventEmitter);

ChromeTimelineProbe.prototype.id = 'ChromeTimelineProbe';

ChromeTimelineProbe.prototype.setup = function(cfg) {
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

ChromeTimelineProbe.prototype.start = function(browser) {
	var me = this;
	return browser.logTypes().then(function(logs) {
		log.debug('Supported log types', logs);
		me.enabled = (logs.indexOf('performance') !== -1);
	}).then(function() {
		if (me.enabled) {
			return browser.log('performance');
		}
	});
};

ChromeTimelineProbe.prototype.teardown = function(browser) {
	if (this.enabled) {
		var me = this;
		return browser.log('performance').then(function(arg) {
			log.debug('Got Performance timeline results');
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

module.exports = ChromeTimelineProbe;