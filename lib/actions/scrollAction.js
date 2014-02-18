module.exports = function(cfg) {
	return function(browser) {
		var fs = require('fs'),
			wd = require('wd'),
			jsmin = require('jsmin').jsmin,
			helpers = require('../helpers');

		var log = helpers.log();

		var code = jsmin(fs.readFileSync(__dirname + '/page_scripts/scroll.js', 'utf-8')),
			runner = function(el) {
				window.__ScrollActionComplete = false;
				var action = new __ScrollAction(function() {
					window.__ScrollActionComplete = true;
				});
				document.body.scrollTop = 1;
				action.start(el || (document.body.scrollTop === 1 ? document.body : document.documentElement));
			};

		log.debug('Initializing Scroll function');
		return browser.execute(code + helpers.fnCall(runner, cfg || 'undefined')).then(function() {
			log.debug('Waiting for Scrolling to finish');
			return browser.waitFor({
				asserter: wd.asserters.jsCondition('(window.__ScrollActionComplete === true)', false),
				timeout: 1000 * 60 * 10,
				pollFreq: 1000
			});
		})
	}
}