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
		if (typeof window.chrome !== 'undefined') {
			window.webkitRequestAnimationFrame(function() {
				window.__navTimings = window.performance.timing;
				var first_paint_secs = window.chrome.loadTimes().firstPaintTime - window.chrome.loadTimes().startLoadTime;
				window.__navTimings.__firstPaint = first_paint_secs * 1000;
			});
		} else if (typeof window.performance !== 'undefined' && typeof window.performance.timing.msFirstPaint !== 'undefined') {
			window.setTimeout(function() {
				window.__navTimings = {
					__firstPaint: window.performance.timing.msFirstPaint - window.performance.timing.navigationStart
				};
				for (var key in window.performance.timing) {
					window.__navTimings[key] = window.performance.timing[key]
				}
			}, 1000);
		} else if (typeof window.performance !== 'undefined' && typeof window.performance.timing !== 'undefined') {
			window.__navTimings = window.performance.timing;
		} else {
			window.__navTimings = {};
		}
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