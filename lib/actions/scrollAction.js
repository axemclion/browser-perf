/**
	Using this class directly - 

	browserperf.actions.scrollAction(cfg), where cfg is

	cfg - <object> options for scrolling. Properties of cfg can be
	
	direction <string>: up|down|left|right (default: down)
	scrollElement <string>: Javascript code evaluated in browser to pick element to scroll (default: document.body)
	speed <number>: scroll speed (default: 800)
	pollFreq <number>: frequency at which polling should be done to check if scroll is complete (default: 200)
*/
var fs = require('fs'),
	wd = require('wd'),
	Q = require('q'),
	debug = require('debug')('bp:actions:scroll'),
	jsmin = require('jsmin').jsmin,
	helpers = require('../helpers');

module.exports = function(cfg) {
	cfg = cfg || {};

	function scroll(browser) {

		var raf_scroll = jsmin(fs.readFileSync(__dirname + '/page_scripts/raf_scroll.js', 'utf-8')),
			chrome_scroll = jsmin(fs.readFileSync(__dirname + '/page_scripts/chrome_scroll.js', 'utf-8')),
			gesture_common = jsmin(fs.readFileSync(__dirname + '/page_scripts/gesture_common.js', 'utf-8'));

		var runner = function(opts) {
			console.log("Scrolling with ", opts);
			window.__scrollActionDone = false;
			window.__scrollAction = new __ScrollAction(function() {
				window.__scrollActionDone = true;
			});
			window.__scrollAction.start({
				element: eval(opts.el),
				left_start_percentage: opts.left_start_percentage,
				top_start_percentage: opts.top_start_percentage,
				direction: opts.direction,
				speed: opts.speed,
				gesture_source_type: opts.gesture_source_type
			});
		};

		debug('Initializing Scroll function');
		return browser.execute(gesture_common + chrome_scroll + raf_scroll + helpers.fnCall(runner, {
			left_start_percentage: 0.5,
			top_start_percentage: 0.5,
			direction: cfg.direction || 'down',
			speed: cfg.speed || 800,
			gesture_source_type: 0,
			el: cfg.scrollElement || 'document.body'
		})).then(function() {
			debug('Waiting for Scrolling to finish');
			return browser.waitFor({
				asserter: wd.asserters.jsCondition('(window.__scrollActionDone === true)', false),
				timeout: 1000 * 60 * 10,
				pollFreq: cfg.pollFreq || 2000
			});
		})
	};

	scroll.setup = function(cfg) {
		cfg.browsers = cfg.browsers.map(function(browser) {
			if (browser.browserName && (browser.browserName.match(/android/i) || browser.browserName.match(/chrome/i))) {
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

	return scroll;
};