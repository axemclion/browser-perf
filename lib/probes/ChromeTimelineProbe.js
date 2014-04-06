var util = require('util'),
	events = require('events'),
	Q = require('q'),
	helpers = require('../helpers'),
	log = helpers.log();

function ChromeTimelineProbe() {
	events.EventEmitter.call(this);
}

util.inherits(ChromeTimelineProbe, events.EventEmitter);

ChromeTimelineProbe.prototype.id = 'ChromeTimelineProbe';
ChromeTimelineProbe.prototype.browsers = ['chrome', 'android'];

ChromeTimelineProbe.prototype.isEnabled = function(browser) {
	return (this.browsers.filter(function(allowedBrowser) {
		return browser.browserName.match(new RegExp(allowedBrowser));
	}).length !== 0);
}

ChromeTimelineProbe.prototype.setup = function(cfg) {
	var me = this;
	cfg.browsers = cfg.browsers.map(function(browser) {
		if (me.isEnabled(browser)) {
			helpers.extend(browser, {
				chromeOptions: {
					args: ['--disable-popup-blocking']
				},
				loggingPrefs: {
					performance: 'ALL'
				}
			});
		}
		return browser;
	});
	return Q(cfg);
};

ChromeTimelineProbe.prototype.start = function(browser) {
	var me = this;
	return browser.sessionCapabilities().then(function(caps) {
		if (me.isEnabled(caps) && parseInt(caps.version) >= 29) {
			// Flushing everythign in timeline before now
			return browser.log('performance');
		}
	});
};

ChromeTimelineProbe.prototype.teardown = function(browser) {
	var me = this;
	return browser.sessionCapabilities().then(function(caps) {
		if (me.isEnabled(caps) && parseInt(caps.version) >= 29) {
			return me.fetchTimelineData(browser);
		}
	});
};

ChromeTimelineProbe.prototype.fetchTimelineData = function(browser) {
	var me = this,
		windowName = null;
	return browser.log('performance').then(function(arg) {
		log.debug('[ChromeTimelineProbe]: Got Performance timeline results');
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
						type: 'chrome.timeline',
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