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
		return this.fetchTimelineData(browser);
	}
};

ChromeTimelineProbe.prototype.fetchTimelineData = function(browser) {
	var me = this;
	return browser.log('performance').then(function(arg) {
		log.debug('Got Performance timeline results');
		data = arg.map(function(x) {
			var message = JSON.parse(x.message).message;
			if (typeof message.params !== 'undefined' && typeof message.params.record !== 'undefined') {
				return message.params.record;
			}
		}).filter(function(d) {
			return (typeof d !== 'undefined');
		});
		(function process(data) {
			data.forEach(function(d) {
				if (typeof d.endTime !== 'undefined' && typeof d.startTime !== 'undefined') {
					me.emit('data', {
						type: 'timeline',
						browser: 'chrome',
						value: d
					});
				}
				if (Array.isArray(d.children)) {
					process(d.children);
				}
			});
		}(data));
		//require('fs').writeFileSync(__dirname + '/../../timeline.json', JSON.stringify(data));
	});
};

module.exports = ChromeTimelineProbe;