var wd = require('wd'),
	fs = require('fs'),
	jsmin = require('jsmin').jsmin;

var SmoothnessMetric = require('./metrics/smoothness'),
	options = require('./options');

var log = null;

var telemetryScript = function() {
	var scripts = [];
	[
		'/page_scripts/vendor/scroll.js',
		'/page_scripts/vendor/smoothness.js',
		'/page_scripts/benchmarks.js',
		'/page_scripts/runner.js'
	].forEach(function(file) {
		scripts.push(jsmin(fs.readFileSync(__dirname + file, {
			encoding: 'utf-8'
		})).replace(/\'use strict\'/, ''));
	});
	return scripts.join(';');
}

var testRunner = function(browser, url, config, cb) {
	var result;
	log.debug('Running on', config.browserName);
	browser
		.init(config)
		.get(url)
		.execute(telemetryScript())
		.waitFor({
			asserter: wd.asserters.jsCondition('(typeof window.__telemetryData__ !== "undefined")', false),
			timeout: 1000 * 60 * 10,
			pollFreq: 100
		})
		.eval('window.__telemetryData__')
		.then(function(data) {
			log.debug('Got data back');
			data._browserName = config.browserName;
			result = data;
		})
		.fin(function() {
			log.debug('Completed running on', config.browserName);
			if (!config.debug) {
				return browser.quit();
			}
		})
		.then(function() {
			log.debug('Returning results');
			cb(null, result);
		}, function(err) {
			log.debug('An error occured, returning error');
			cb(err);
		});
}

module.exports = function(url, cb, opts) {
	opts = options.defaults(opts), log = opts.log;
	var browser = wd.promiseChainRemote(opts.seleniumConfig),
		results = [],
		errors = [];

	log.debug('Running on %s', browser.noAuthConfigUrl.hostname);

	browser.on('status', function(data) {
		log.debug(data);
	});
	browser.on('command', function(meth, path, data) {
		if (data && typeof data === 'object') {
			var str = JSON.stringify(data);
			if (str.length > 80)
				data = str.substring(0, 75) + '...';
		}
		log.debug(' > ', meth, path, '');
	});

	(function runTest(i) {
		if (i < opts.browserConfig.length) {
			testRunner(browser, url, opts.browserConfig[i], function(err, res) {
				if (err) {
					errors.push(err);
				} else {
					results.push(res);
				}
				runTest(i + 1);
			});
		} else {
			cb(errors.length === 0 ? null : errors, results);
		}
	}(0));
}