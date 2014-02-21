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

ChromeExtensionProbe.prototype.teardown = function(browser) {
	var me = this,
		windowName = null;
	return browser.log('performance').then(function(data) {
		debugger;
		log.debug('[ChromeExtensionProbe]: Got Performance timeline results');
		me.processTimelineEvents(data);
	}).then(function() {
		return browser.execute('window.name = window.name || "browser-perf"');
	}).then(function() {
		return browser.windowName();
	}).then(function(data) {
		log.debug('[ChromeExtensionProbe]: Original window is ', data);
		windowName = data;
	}).then(function() {
		return browser.newWindow('file://' + me.filename, 'tracing_file');
	}).then(function() {
		return browser.window('tracing_file');
	}).then(function() {
		return browser.eval('document.body.innerText');
	}).then(function(data) {
		log.debug('[ChromeExtensionProbe]: Got Performance Tracing results');
		me.processTracingData(data);
	}).then(function() {
		return browser.close();
	}).then(function() {
		log.debug('[ChromeExtensionProbe]: Finished ChromeExtensionProbe data');
		return browser.window(windowName);
	});
};

ChromeExtensionProbe.prototype.processTimelineEvents = function(result) {
	if (!Array.isArray(result) || result.length === 0) {
		return;
	}
	var me = this;
}

ChromeExtensionProbe.prototype.processTracingData = function(data) {
	var parsedData = [];
	try {
		parsedData = JSON.parse(data)
	} catch (e) {
		log.error('[ChromeExtensionProbe]: Could not read Tracing file');
	}
}


module.exports = ChromeExtensionProbe;