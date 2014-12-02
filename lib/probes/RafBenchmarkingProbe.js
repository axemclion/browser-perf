var Q = require('q'),
	util = require('util'),
	events = require('events'),
	helpers = require('../helpers'),
	debug = require('debug')('bp:probes:RafBenchmarkingProbe');

function RafBenchmarkingProbe() {
	events.EventEmitter.call(this);
}

util.inherits(RafBenchmarkingProbe, events.EventEmitter);

RafBenchmarkingProbe.prototype.id = 'RafBenchmarkingProbe';

RafBenchmarkingProbe.prototype.start = function(browser) {
	var code = function() {
		var getTimeMs = (function() {
			if (window.performance)
				return (performance.now ||
					performance.mozNow ||
					performance.msNow ||
					performance.oNow ||
					performance.webkitNow).bind(window.performance);
			else
				return function() {
					return new Date().getTime();
				};
		})();

		var requestAnimationFrame = (function() {
			return window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				window.oRequestAnimationFrame ||
				window.msRequestAnimationFrame ||
				function(callback) {
					window.setTimeout(callback, 1000 / 60);
			};
		})().bind(window);

		window.__RafRecorder = {
			frames: [],
			flush: true,
			record: function(timeStamp) {
				if (__RafRecorder.flush) {
					__RafRecorder.frames = [];
					__RafRecorder.flush = false;
				}
				__RafRecorder.frames.push(timeStamp);
				requestAnimationFrame(__RafRecorder.record);
			},
			get: function() {
				__RafRecorder.flush = true;
				return __RafRecorder.frames;
			}
		};

		requestAnimationFrame(window.__RafRecorder.record);

	};

	return browser.execute(helpers.fnCall(code));
};

RafBenchmarkingProbe.prototype.teardown = function(browser) {
	debug('Clearing timer Interval');
	var me = this;
	return browser.eval('window.__RafRecorder.get()').then(function(res) {
		if (Array.isArray(res) && res.length > 0) {
			me.emit('data', res);
		}
		clearTimeout(me.timerHandle);
	}, function(err) {
		me.emit('error', err);
		clearTimeout(me.timerHandle);
	});
};

module.exports = RafBenchmarkingProbe;