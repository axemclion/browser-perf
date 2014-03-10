var util = require('util'),
	events = require('events'),
	Q = require('q'),
	wd = require('wd'),
	helpers = require('../helpers'),
	log = helpers.log();

function ChromeTracingProbe() {
	events.EventEmitter.call(this);
}

util.inherits(ChromeTracingProbe, events.EventEmitter);

ChromeTracingProbe.prototype.id = 'ChromeTracingProbe';
ChromeTracingProbe.prototype.browsers = ['chrome'];

ChromeTracingProbe.prototype.setup = function(cfg) {
	var me = this;
	cfg.browsers = cfg.browsers.map(function(browser) {
		if (browser.browserName.match(/chrome/gi)) {
			if (typeof browser.platform === 'undefined') {
				log.warn('No platform specified for the browser. ChromeTracingProbe needs a platform to save the tracing file. Saving file at /var/tmp');
			}
			if (browser.platform && browser.platform.match(/windows/gi)) {
				me.filename = 'c:/tracing.json'
			} else {
				me.filename = '/var/tmp/tracing.json'
			}
			helpers.extend(browser, {
				chromeOptions: {
					args: ['--disable-popup-blocking', '--trace-startup', '--trace-startup-file=' + me.filename]
				}
			});
		}
		return browser;
	});
	return Q(cfg);
};

ChromeTracingProbe.prototype.teardown = function(browser) {
	var me = this;
	return browser.sessionCapabilities().then(function(caps) {
		if (caps.browserName.match(/chrome/gi) && !caps.platform.match(/android/gi)) {
			return me.fetchTracingData(browser);
		}
	});
};

ChromeTracingProbe.prototype.fetchTracingData = function(browser) {
	var me = this;
	log.debug('[ChromeTracingProbe]: Fetching Tracing Data');
	return browser.execute('window.name = window.name || "browser-perf"').then(function() {
		return browser.windowName();
	}).then(function(data) {
		log.debug('[ChromeTracingProbe]: Original window is ', data);
		windowName = data;
	}).then(function() {
		return browser.newWindow('about:blank', 'tracing_file');
	}).then(function() {
		return browser.window('tracing_file');
	}).then(function() {
		return browser.get('file://' + me.filename);
	}).then(function() {
		return browser.execute(helpers.fnCall(function() {
			try {
				var events = [
					'ImplThreadRenderingStats::IssueTraceEvent',
					'MainThreadRenderingStats::IssueTraceEvent',
					'BenchmarkInstrumentation::ImplThreadRenderingStats',
					'BenchmarkInstrumentation::MainThreadRenderingStats'
				];
				var tracingData = {
					rawData: JSON.parse(document.body.innerText).traceEvents,
					results: []
				}, BATCH = 2000,
					pending = Math.ceil(tracingData.rawData.length / BATCH, 0);

				function process(start) {
					window.setTimeout(function() {
						console.log('Processing', start, pending);
						var res = [];
						for (var i = start; i < start + BATCH && i < tracingData.rawData.length; i++) {
							var val = tracingData.rawData[i];
							for (var j = 0; j < events.length; j++) {
								if (val.name === events[j]) {
									res.push(val);
								}
							}
						}
						pending--;
						tracingData.results = tracingData.results.concat(res);
					}, 1);
				}
				for (var i = 0; i < tracingData.rawData.length; i += BATCH) {
					process(i);
				}
				window.__tracingData = tracingData;
			} catch (e) {
				console.log('Could not read tracing data', e);
				window.__tracingData = {
					results: []
				};
			}
		}));
	}).then(function() {
		return browser.waitFor({
			asserter: wd.asserters.jsCondition('(typeof window.__tracingData !== "undefined")', false),
			timeout: 1000 * 60 * 10,
			pollFreq: 1000
		});
	}).then(function() {
		return browser.eval('window.__tracingData.results');
	}).then(function(data) {
		if (Array.isArray(data)) {
			data.forEach(function(d) {
				me.emit('data', {
					type: 'chrome.tracing',
					value: d
				});
			});
		}
	}).then(function() {
		return browser.close();
	}).then(function() {
		log.debug('[ChromeTracingProbe]: Finished ChromeTracingProbe data');
		return browser.window(windowName);
	});
};

module.exports = ChromeTracingProbe;