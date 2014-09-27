/**
	Using this class directly - 

	browserperf.actions.scrollAction(cfg), where cfg is

	cfg - <object> options for scrolling. Properties of cfg can be
	
	direction <string>: up|down|left|right (default: down)
	scrollElement <string>: Javascript code evaluated in browser to pick element to scroll (default: document.body)
	speed <number>: scroll speed (default: 800)
	pollFreq <number>: frequency at which polling should be done to check if scroll is complete (default: 200)
*/

module.exports = function(cfg) {
	cfg = cfg || {};
	return function(browser) {
		var fs = require('fs'),
			wd = require('wd'),
			jsmin = require('jsmin').jsmin,
			helpers = require('../helpers');

		var log = helpers.log('scrollAction');

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

		log.debug('Initializing Scroll function');
		return browser.execute(gesture_common + chrome_scroll + raf_scroll + helpers.fnCall(runner, {
			left_start_percentage: 0.5,
			top_start_percentage: 0.5,
			direction: cfg.direction || 'down',
			speed: cfg.speed || 800,
			gesture_source_type: 0,
			el: cfg.scrollElement || 'document.body'
		})).then(function() {
			log.debug('Waiting for Scrolling to finish');
			return browser.waitFor({
				asserter: wd.asserters.jsCondition('(window.__scrollActionDone === true)', false),
				timeout: 1000 * 60 * 10,
				pollFreq: cfg.pollFreq || 2000
			});
		})
	}
}