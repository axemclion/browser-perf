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

var testRunner = function(b, url, config, opts, cb) {
	var check = function(err) {
		if (err) {
			b.quit(function() {
				cb(err, null);
			});
		}
	}, result;
	log.debug('Running on', config.browserName);

	b.init(config, function(err, res) {
		check(err);
		!err && opts.preScript(b, function(err, res) {
			check(err);
			!err && b.get(url, function(err) {
				check(err);
				!err && b.execute(telemetryScript(), function() {
					b.waitFor({
						asserter: wd.asserters.jsCondition('(typeof window.__telemetryData__ !== "undefined")', false),
						timeout: 1000 * 60 * 10,
						pollFreq: 1000
					}, function(err, res) {
						check(err);
						res && b.eval('window.__telemetryData__', function(err, data) {
							b.quit(function(err) {
								if (data) {
									log.debug('Got data back');
									data._browserName = config.browserName;
									data._url = url;
									result = data;
									cb(null, result);
								}
							});
						});
					});
				});
			});
		});
	});
}

module.exports = function(url, cb, opts) {
	opts = options.defaults(opts), log = opts.log;
	var browser = wd.remote(opts.seleniumConfig),
		results = [],
		errors = [];

	log.debug('Selenium is on %s', browser.noAuthConfigUrl.hostname);

	browser.on('status', function(data) {
		log.debug(data);
	});
	browser.on('command', function(meth, path, data) {
		if (data && typeof data === 'object') {
			var str = JSON.stringify(data);
			if (str.length > 80)
				data = str.substring(0, 75) + '...';
		}
		log.debug(' > ', meth, path, data);
	});

	(function runTest(i) {
		if (i < opts.browserConfig.length) {
			testRunner(browser, url, opts.browserConfig[i], opts, function(err, res) {
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