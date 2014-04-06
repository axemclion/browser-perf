var util = require('util'),
	events = require('events'),
	Q = require('q'),
	wd = require('wd'),
	helpers = require('../helpers'),
	log = helpers.log();

var TRACING_WINDOW = 'bptracing';

function ChromeTracingProbe() {
	events.EventEmitter.call(this);
}

util.inherits(ChromeTracingProbe, events.EventEmitter);

ChromeTracingProbe.prototype.id = 'ChromeTracingProbe';
ChromeTracingProbe.prototype.browsers = ['chrome'];

ChromeTracingProbe.prototype.isEnabled = function(browser) {
	return this.browsers.filter(function(allowedBrowser) {
		return browser.browserName.match(new RegExp(allowedBrowser));
	}).length !== 0 && parseInt(browser.version, 10) >= 33
}

ChromeTracingProbe.prototype.setup = function(cfg) {
	var me = this;
	this.debugBrowser = cfg.debugBrowser;
	cfg.browsers = cfg.browsers.map(function(browser) {
		helpers.extend(browser, {
			chromeOptions: {
				args: ['--disable-popup-blocking']
			}
		});
		return browser;
	});
	return Q(cfg);
};

var lifeCycle = function(methodName) {
	return function(browser) {
		var me = this;
		return browser.sessionCapabilities().then(function(caps) {
			if (me.isEnabled(caps)) {
				return me[methodName](browser);
			}
		});
	};
}

ChromeTracingProbe.prototype.start = lifeCycle('startRecordingTrace_');
ChromeTracingProbe.prototype.teardown = lifeCycle('stopRecordingTrace_');

ChromeTracingProbe.prototype.startRecordingTrace_ = function(browser) {
	var me = this;
	return browser.windowHandle().then(function(handle) {
		me.originalWindow = handle;
	}).then(function() {
		return browser.newWindow('about:blank', TRACING_WINDOW);
	}).then(function() {
		return browser.window(TRACING_WINDOW);
	}).then(function() {
		return browser.windowHandle();
	}).then(function(handle) {
		me.tracingWindow = handle;
		return browser.get('chrome://tracing');
	}).then(function() {
		return browser.elementById('record-button');
	}).then(function(el) {
		return el.click();
	}).then(function() {
		return browser.waitForElementByClassName('record-dialog-overlay', 5000);
	}).then(function() {
		return browser.execute(helpers.fnCall(function() {
			document.getElementsByClassName('none-btn')[0].click();
			document.getElementById('benchmark').click();
			window.profilingView.activeTrace_ = null;
			document.getElementsByClassName('record-dialog-overlay')[0].recordButtonEl_.click();
		}));
	}).then(function() {
		return browser.window(me.originalWindow);
	});
}

ChromeTracingProbe.prototype.stopRecordingTrace_ = function(browser) {
	var me = this;
	return browser.windowHandles().then(function() {
		return browser.window(me.tracingWindow);
	}).then(function() {
		return browser.execute("document.querySelectorAll('.overlay button')[0].click()");
	}).then(function() {
		return browser.waitFor({
			asserter: wd.asserters.jsCondition('window.profilingView.activeTrace_', false),
			timeout: 1000 * 60 * 3,
			pollFreq: 1000
		})
	}).then(function() {
		return browser.execute(helpers.fnCall(me.parseTracingData_));
	}).then(function() {
		return browser.waitFor({
			asserter: wd.asserters.jsCondition('(typeof window.__tracingData !== "undefined")', false),
			timeout: 1000 * 60 * 3,
			pollFreq: 1000
		});
	}).then(function() {
		return browser.eval('window.__tracingData.results');
	}).then(function(data) {
		me.emit('data', {
			type: 'chrome.tracing',
			value: data
		});
	}).then(function() {
		if (!me.debugBrowser) {
			return browser.close();
		}
	}).then(function() {
		log.debug('[ChromeTracingProbe]: Finished ChromeTracingProbe data ' + me.originalWindow);
		return browser.window(me.originalWindow);
	});
};


ChromeTracingProbe.prototype.parseTracingData_ = function() {
	try {
		console.log("Trace Data is ", window.profilingView.activeTrace_);
		var activeTraceData = JSON.parse(window.profilingView.activeTrace_.data).traceEvents;
		var events = [
			'ImplThreadRenderingStats::IssueTraceEvent',
			'MainThreadRenderingStats::IssueTraceEvent',
			'BenchmarkInstrumentation::ImplThreadRenderingStats',
			'BenchmarkInstrumentation::MainThreadRenderingStats'
		];
		var tracingData = {
			rawData: activeTraceData,
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
};


module.exports = ChromeTracingProbe;