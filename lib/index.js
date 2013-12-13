var wd = require('wd'),
	glob = require('glob').sync,
	fs = require('fs'),
	bunyan = require('bunyan'),
	jsmin = require('jsmin').jsmin,
	FirefoxProfile = require('firefox-profile');

var log = null;

var telemetryScript = function() {
	var scripts = [];
	[
		'vendor/scroll.js',
		'vendor/smoothness_measurement.js',
		'benchmarks.js',
		'runner.js'
	].forEach(function(file) {
		scripts.push(jsmin(fs.readFileSync(__dirname + '/scripts/' + file, {
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
			result = data
		})
		.fin(function() {
			log.debug('Completed running on', config.browserName);
			return browser.quit();
		})
		.then(function() {
			cb(null, result);
		}, function(err) {
			cb(err);
		});
}

var defaults = function(opts) {
	opts = opts || {};
	log = opts.logger || bunyan.createLogger({
		name: 'index.js',
		level: debug,
		stream: stdout
	});
	opts.selenium = opts.selenium || {
		host: 'ondemand.saucelabs.com:80',
		user: process.env.SAUCE_USERNAME,
		pwd: process.env.SAUCE_ACCESS_KEY,
	};
	opts.browsers = parseBrowsers(opts.browsers || ['chrome']);
	return opts;
};

var parseBrowsers = function(browsers) {
	var result = [],
		browserConfig = {
			chrome: {
				browserName: 'chrome',
				chromeOptions: {
					args: ['--disable-popup-blocking', '--enable-gpu-benchmarking', '--enable-thread-composting']
				},
				'disable-popup-handler': true
			},
			firefox: {
				browserName: 'firefox',
				firefox_profile: (function() {
					var fp = new FirefoxProfile();
					fp.setPreference('dom.send_after_paint_to_content', true);
					fp.setPreference('dom.disable_open_during_load', false);
					fp.updatePreferences();
					return fp.encodedSync();
				}()),
				'disable-popup-handler': true
			}
		};

	if (typeof browsers === 'String') {
		browsers = [browsers];
	}
	browsers.forEach(function(browser) {
		if (typeof browser === 'string') {
			if (browser in browserConfig) {
				result.push(browserConfig[browser])
			} else {
				result.push({
					browserName: browser
				});
			}
		} else if (typeof browser === 'object') {
			if (browser in browserConfig) {
				for (var key in browserConfig[browser.browserName]) {
					if (!key in browser) {
						browser[key] = browserConfig[browser.browserName][key];
					}
				}
			}
			result.push(browser);
		}
	});
	return result;
};

module.exports = function(url, cb, opts) {
	opts = defaults(opts);
	var browser = wd.promiseChainRemote(opts.selenium),
		results = [],
		errors = [];

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
		if (i < opts.browsers.length) {
			testRunner(browser, url, opts.browsers[i], function(err, res) {
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