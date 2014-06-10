var Q = require('q'),
	util = require('util'),
	events = require('events'),
	helpers = require('../helpers'),
	log = helpers.log('GpuBenchmarkingProbe');

function GpuBenchmarkingProbe() {
	events.EventEmitter.call(this);
}

util.inherits(GpuBenchmarkingProbe, events.EventEmitter);

GpuBenchmarkingProbe.prototype.id = 'GpuBenchmarkingProbe';
GpuBenchmarkingProbe.prototype.browsers = ['chrome'];

GpuBenchmarkingProbe.prototype.setup = function(cfg) {
	cfg.browsers = cfg.browsers.map(function(browser) {
		if (browser.browserName.match(/chrome/gi)) {
			helpers.extend(browser, {
				chromeOptions: {
					args: ['--enable-gpu-benchmarking', '--enable-thread-composting']
				}
			});
		}
		return browser;
	});
	return Q(cfg);
};

function fetchData(browser) {
	var code = function() {
		if (window.chrome && chrome.gpuBenchmarking && chrome.gpuBenchmarking.renderingStats) {
			return chrome.gpuBenchmarking.renderingStats();
		}
	};

	var me = this;
	return browser.eval(helpers.fnCall(code)).then(function(res) {
		log.debug(res);
		me.emit('data', res);
	}, function(err) {
		me.emit('error', err);
	});
}

GpuBenchmarkingProbe.prototype.start = GpuBenchmarkingProbe.prototype.teardown = fetchData;

module.exports = GpuBenchmarkingProbe;