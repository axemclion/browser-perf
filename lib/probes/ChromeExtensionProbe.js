var util = require('util'),
	events = require('events'),
	Q = require('q'),
	request = require('request'),
	helpers = require('../helpers'),
	log = helpers.log();

function ChromeExtensionProbe() {
	events.EventEmitter.call(this);
}

util.inherits(ChromeExtensionProbe, events.EventEmitter);

ChromeExtensionProbe.prototype.id = 'ChromeExtensionProbe';
ChromeExtensionProbe.prototype.browsers = ['chrome'];

ChromeExtensionProbe.prototype.setup = function(cfg) {
	var me = this;
	cfg.browsers = cfg.browsers.map(function(browser) {
		if (browser.browserName.match(/chrome/gi)) {
			if (browser.platform.match(/windows/gi)) {
				me.filename = 'c:/tracing.json'
			} else {
				me.filename = '/var/tmp/tracing.json'
			}
			helpers.extend(browser, {
				chromeOptions: {
					args: ['--disable-popup-blocking', '--trace-startup', '--trace-startup-file=' + me.filename]
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

ChromeExtensionProbe.prototype.teardown = function(cfg, browser) {
	console.log('--------------------')
	var me = this;
	return browser.log('performance').then(function(data) {
		log.debug('[ChromeExtensionProbe]: Got Performance timeline results', data.length);
		me.processTimelineEvents(data);
	}).then(function() {
		return browser.get('file://' + me.filename);
	}).then(function() {
		return browser.eval('document.body.innerText');
	}).then(function(data) {
		log.debug('[ChromeExtensionProbe]: Got Performance Tracing results');
		me.processTracingData(data);
	});
};

ChromeExtensionProbe.prototype.processTimelineEvents = function(result) {
	if (!Array.isArray(result) || result.length === 0) {
		return;
	}
	var me = this;
	result.forEach(function(res) {});
}

ChromeExtensionProbe.prototype.processTracingData = function(data) {
	var parsedData = [];
	try {
		parsedData = JSON.parse(data)
	} catch (e) {
		log.error('[ChromeExtensionProbe]: Could not read Tracing file');
	}
	me.emit('data', {
		type: 'chrome.tracing',
		value: parsedData
	});
}


module.exports = ChromeExtensionProbe;