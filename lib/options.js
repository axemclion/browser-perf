var log = null;
var sanitizers = [
	// log
	function(opts) {
		helpers = require('./helpers');
		opts.logger = opts.logger || opts.log;
		helpers.setLogger(opts.logger);
		log = helpers.log();
		return opts;
	},

	// configFile
	function(opts) {
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
				log.warn('Could not read or parse configuration file %s', opts.configFile, e);
			}
			delete opts.configFile;
		}
		return opts;
	},

	// selenium
	function(opts) {
		opts.selenium = opts.selenium || 'localhost:4444';
		if (typeof opts.selenium === 'string') {
			if (!opts.selenium.match(/^http:\/\//)) {
				opts.selenium = 'http://' + opts.selenium
			}
			var url = require('url');
			var seleniumUrl = url.parse(opts.selenium);
			opts.selenium = {
				hostname: seleniumUrl.hostname,
				port: seleniumUrl.port,
				auth: seleniumUrl.auth
			}
		}

		if (typeof opts.username !== 'undefined') {
			opts.selenium.user = opts.username;
		}

		if (typeof opts.accesskey !== 'undefined') {
			opts.selenium.pwd = opts.accesskey;
		}

		opts.selenium.port = parseInt(opts.selenium.port, 10);
		return opts;
	},

	// browsers
	function(opts) {
		var browserConfig = {}; // Defaults for browsers to be added here

		var passedBrowsers = opts.browsers || opts.browser;
		if (typeof passedBrowsers === 'undefined') {
			passedBrowsers = ['chrome'];
		} else if (typeof passedBrowsers === 'string') {
			passedBrowsers = passedBrowsers.split(/[,;]/);
		}

		var result = [];
		passedBrowsers.forEach(function(passedBrowser) {
			passedBrowser = (typeof passedBrowser === 'string' ? {
				'browserName': passedBrowser
			} : passedBrowser);

			if (typeof browserConfig[passedBrowser.browserName] !== 'undefined') {
				var matchingBrowserCfg = browserConfig[passedBrowser.browserName]
				for (var key in matchingBrowserCfg) {
					if (typeof passedBrowser[key] === 'undefined') {
						passedBrowser[key] = matchingBrowserCfg[key];
					}
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
			opts.SAUCE_USERNAME = opts.username;
			opts.SAUCE_ACCESSKEY = opts.accesskey;
		} else if (opts.selenium.hostname.match(/hub.browserstack.com/)) {
			opts.BROWSERSTACK_USERNAME = opts.username;
			opts.BROWSERSTACK_KEY = opts.key;
		}

		if (typeof opts.BROWSERSTACK_USERNAME !== 'undefined') {
			opts.browsers.forEach(function(browser) {
				browser['browserstack.user'] = opts.BROWSERSTACK_USERNAME;
				browser['browserstack.key'] = opts.BROWSERSTACK_KEY;
			});
			delete opts.BROWSERSTACK_USERNAME;
			delete opts.BROWSERSTACK_KEY;
		} else if (opts.SAUCE_USERNAME !== 'undefined') {
			opts.selenium.username = opts.SAUCE_USERNAME;
			opts.selenium.pwd = opts.SAUCE_ACCESSKEY;
			delete opts.SAUCE_ACCESSKEY;
			delete opts.SAUCE_USERNAME;
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
	}
]


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