var sanitizers = [
	// debugBrowser
	function(opts) {
		if (typeof opts.debugBrowser === 'undefined') {
			opts.debugBrowser = false;
		}
		return opts;
	},

	// configFile
	function(opts) {
		var fs = require('fs');
		if (opts.configFile) {
			try {
				config = JSON.parse(fs.readFileSync(opts.configFile, 'utf-8'));
				if (config) {
					for (var key in opts) {
						if (typeof opts[key] !== 'undefined') {
							config[key] = opts[key];
						}
					}
				}
				opts = config;
			} catch (e) {
				throw 'Could not read or parse configuration file ' + e;
			}
			delete opts.configFile;
		}
		return opts;
	},

	// selenium
	function(opts) {
		opts.selenium = opts.selenium || 'http://localhost:4444/wd/hub';
		if (typeof opts.selenium === 'string') {
			if (opts.selenium === 'ondemand.saucelabs.com' || opts.selenium === 'hub.browserstack.com') {
				opts.selenium = opts.selenium + '/wd/hub';
			}

			if (!opts.selenium.match(/^http:\/\//)) {
				opts.selenium = 'http://' + opts.selenium
			}
			var url = require('url');
			opts.selenium = url.parse(opts.selenium);
		}

		if (typeof opts.username !== 'undefined') {
			opts.selenium.user = opts.username;
		}

		if (typeof opts.accesskey !== 'undefined') {
			opts.selenium.pwd = opts.accesskey;
		}
		if (typeof opts.selenium.port !== 'number') {
			opts.selenium.port = parseInt(opts.selenium.port, 10);
		}
		if (isNaN(opts.selenium.port)) {
			opts.selenium.port = null;
		}

		return opts;
	},

	// browsers
	function(opts) {
		var browserConfig = {}; // Defaults for browsers to be added here

		var passedBrowsers = opts.browsers || opts.browser;
		if (typeof passedBrowsers === 'undefined') {
			passedBrowsers = [{
				browserName: 'chrome',
				version: 35
			}];
		} else if (typeof passedBrowsers === 'string') {
			passedBrowsers = passedBrowsers.split(/[,;]/);
		}

		var result = [];
		passedBrowsers.forEach(function(passedBrowser) {
			passedBrowser = (typeof passedBrowser === 'string' ? {
				'browserName': passedBrowser
			} : passedBrowser);

			if (typeof browserConfig[passedBrowser.browserName] !== 'undefined') {
				var matchingBrowserCfg = browserConfig[passedBrowser.browserName] || browserConfig[passedBrowser.browserName]
				for (var key in matchingBrowserCfg) {
					if (typeof passedBrowser[key] === 'undefined') {
						passedBrowser[key] = matchingBrowserCfg[key];
					}
				}
			}
			// Add activity name for android browsers
			if (passedBrowser.browserName && passedBrowser.browserName.match(/android/gi)) {
				passedBrowser.chromeOptions = passedBrowser.chromeOptions || {};
				if (typeof passedBrowser.chromeOptions.androidPackage === 'undefined') {
					passedBrowser.chromeOptions.androidPackage = 'com.android.chrome';
				}
			}

			// Setting platform if it does not exist
			if (typeof passedBrowser.platform === 'undefined' || typeof passedBrowser.platformName === 'undefined') {
				if (opts.selenium.hostname.match(/ondemand.saucelabs.com/) || opts.selenium.hostname.match(/hub.browserstack.com/)) {
					passedBrowser.platform = 'WINDOWS';
				}
			}

			result.push(passedBrowser);
		});
		opts.browsers = result;
		return opts;
	},

	// username and accesskey or password
	function(opts) {
		opts.accesskey = opts.accesskey || opts.password;
		delete opts.password;
		if (opts.selenium.hostname.match(/ondemand.saucelabs.com/)) {
			opts.SAUCE_USERNAME = opts.SAUCE_USERNAME || opts.username;
			opts.SAUCE_ACCESSKEY = opts.SAUCE_ACCESSKEY || opts.accesskey;
			if (typeof opts.SAUCE_USERNAME !== 'undefined' && typeof opts.SAUCE_ACCESSKEY !== 'undefined') {
				opts.selenium.auth = opts.SAUCE_USERNAME + ':' + opts.SAUCE_ACCESSKEY;
				delete opts.SAUCE_ACCESSKEY;
				delete opts.SAUCE_USERNAME;
			}
		} else if (opts.selenium.hostname.match(/hub.browserstack.com/)) {
			opts.BROWSERSTACK_USERNAME = opts.BROWSERSTACK_USERNAME || opts.username;
			opts.BROWSERSTACK_KEY = opts.BROWSERSTACK_KEY || opts.accesskey;
			if (typeof opts.BROWSERSTACK_USERNAME !== 'undefined') {
				opts.browsers.forEach(function(browser) {
					browser['browserstack.user'] = opts.BROWSERSTACK_USERNAME;
					browser['browserstack.key'] = opts.BROWSERSTACK_KEY;
				});
				delete opts.BROWSERSTACK_USERNAME;
				delete opts.BROWSERSTACK_KEY;
				delete opts.selenium.user;
				delete opts.selenium.pwd;
			}
		}

		delete opts.username;
		delete opts.password;
		return opts;
	},

	// preScript, preScriptFile
	function(opts) {
		if (opts.preScriptFile) {
			var path = require('path');
			opts.preScript = require(path.resolve(opts.preScriptFile));
			delete opts.preScriptFile;
		}
		opts.preScript = opts.preScript || function(browser) {
			return;
		};
		return opts;
	},

	// actions
	function(opts) {
		opts.actions = opts.actions || 'scroll';
		if (typeof opts.actions === 'string') {
			opts.actions = opts.actions.split(/[,;]/);
		} else if (typeof opts.actions === 'function') {
			opts.actions = [opts.actions];
		}
		return opts;
	},

	// metrics
	function(opts) {
		opts.metrics = opts.metrics || require('./metrics').builtIns;
		if (typeof opts.metrics === 'string') {
			opts.metrics = opts.metrics.split(/[,;]/);
		} else if (typeof opts.metrics === 'function') {
			opts.metrics = [opts.metrics];
		}
		return opts;
	},

    /**
     * Metric options
     *
     * @example opts.metricOptions = { "METRIC_ID" : { option1 : value1, ... , optionN : valueN } }
     * @param {object} opts
     */
    function (opts) {
        opts.metricOptions = opts.metricOptions || {};
        return opts;
    }
];


module.exports = {
	scrub: function(cfg) {
		cfg = cfg || {};
		sanitizers.forEach(function(sanitizer, i) {
			cfg = sanitizer(cfg);
		});
		return cfg;
	},
	sanitizers: sanitizers
};