var Q = require('q'),
	util = require('util'),
	wd = require('wd'),
	events = require('events'),
	helpers = require('../helpers');

function NavTimingProbe() {
	events.EventEmitter.call(this);
}

util.inherits(NavTimingProbe, events.EventEmitter);

NavTimingProbe.prototype.id = 'NavTimingProbe';

NavTimingProbe.prototype.teardown = function(browser) {
	var code = function() {
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

		requestAnimationFrame(function() {
			var result = {};
			var performance = window.performance || window.webkitPerformance || window.msPerformance || window.mozPerformance;
			if (typeof performance !== 'undefined') {
				var data = performance.timing;
				for (var key in data) {
					if (typeof data[key] === 'number') // Firefox spits out a toJSON function also
						result[key] = data[key];
				}
				if (window.chrome && window.chrome.loadTimes) { // Chrome
					result.firstPaint = (window.chrome.loadTimes().firstPaintTime - window.chrome.loadTimes().startLoadTime) * 1000;
				} else if (typeof window.performance.timing.msFirstPaint === 'number') { // IE
					result.firstPaint = data.msFirstPaint - data.navigationStart;
				}
			}
			window.__navTimings = result;
		});
	};

	var me = this;
	return browser.execute(helpers.fnCall(code)).then(function() {
		return browser.waitFor({
			asserter: wd.asserters.jsCondition('(typeof window.__navTimings !== "undefined")', false),
			timeout: 1000 * 60 * 10,
			pollFreq: 1000
		});
	}).then(function(res) {
		return browser.eval('window.__navTimings');
	}).then(function(res) {
		me.emit('data', res);
	});
};
module.exports = NavTimingProbe;