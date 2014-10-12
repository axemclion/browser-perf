var util = require('util'),
	events = require('events'),
	Q = require('q'),
	helpers = require('../helpers'),
	log = helpers.log('SafariTimelineProbe');

function SafariTimelineProbe() {
	events.EventEmitter.call(this);
}

util.inherits(SafariTimelineProbe, events.EventEmitter);

SafariTimelineProbe.prototype.id = 'SafariTimelineProbe';
SafariTimelineProbe.prototype.browsers = ['safari'];

SafariTimelineProbe.prototype.isEnabled = function(browser) {
	if (browser.browserName && browser.browserName.match(/safari/i)) {
		return true;
	}
	if (browser.app && browser.bundleId) {
		return true;
	}
	return false;
}

SafariTimelineProbe.prototype.setup = function(cfg) {
	var me = this;
	cfg.browsers = cfg.browsers.map(function(browser) {
		if (me.isEnabled(browser)) {
			helpers.extend(browser, {
				loggingPrefs: {
					performance: 'ALL'
				}
			});
		}
		return browser;
	});
	return Q(cfg);
};

SafariTimelineProbe.prototype.start = function(browser) {
	var me = this;
	return browser.sessionCapabilities().then(function(caps) {
		if (me.isEnabled(caps)) {
			// Flushing everythign in timeline before now
			return browser.log('performance');
		}
	});
};

SafariTimelineProbe.prototype.teardown = function(browser) {
	var me = this;
	return browser.sessionCapabilities().then(function(caps) {
		if (me.isEnabled(caps)) {
			return me.fetchTimelineData(browser);
		}
	});
};

SafariTimelineProbe.prototype.fetchTimelineData = function(browser) {
	var me = this;
	return browser.log('performance').then(function(data) {
		log.debug('Got Performance timeline results');
		(function process(data) {
			data.forEach(function(d) {
				if (typeof d.endTime !== 'undefined' && typeof d.startTime !== 'undefined') {
					me.emit('data', {
						type: 'timeline',
						browser: 'safari',
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

module.exports = SafariTimelineProbe;