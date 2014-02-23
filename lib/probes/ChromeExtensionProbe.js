var util = require('util'),
	events = require('events'),
	Q = require('q'),
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
			if (browser.platform && browser.platform.match(/windows/gi)) {
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
	var me = this;
	return browser.sessionCapabilities().then(function(caps) {
		if (caps.browserName.match(/chrome/gi)) {
			return me.fetchData(browser);
		}
	});
};

ChromeExtensionProbe.prototype.fetchData = function(browser) {
	var me = this,
		windowName = null;
	return browser.log('performance').then(function(data) {
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
		return browser.get('file://' + me.filename);
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

ChromeExtensionProbe.prototype.processTimelineEvents = function(arg) {
	var me = this,
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
					value: {
						method: d.type,
						time: d.endTime - d.startTime,
						data: d.data
					}
				});
			}
			if (Array.isArray(d.children)) {
				process(d.children);
			}
		});
	}(data));
}

ChromeExtensionProbe.prototype.processTracingData = function(rawData) {
	var me = this;
	try {
		JSON.parse(rawData).traceEvents.forEach(function(val) {
			// Interpreting frames using https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/
			// Metrics from chromium\depot_tools\depot_tools\src\tools\perf\metrics\rendering_stats.py
			if (
				val.name === 'ImplThreadRenderingStats::IssueTraceEvent' || // Older Chrome
				val.name === 'MainThreadRenderingStats::IssueTraceEvent' ||
				val.name === 'BenchmarkInstrumentation::ImplThreadRenderingStats' || // Chrome 33 
				val.name === 'BenchmarkInstrumentation::MainThreadRenderingStats'
			) {
				me.emit('data', {
					type: 'chrome.tracing',
					value: val
				});
			}
		});
	} catch (e) {
		log.error('[ChromeExtensionProbe]: Could not read Tracing file');
	}
}


module.exports = ChromeExtensionProbe;