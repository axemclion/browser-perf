/*
Parsing options and setting the defaults
*/
var url = require('url'),
	fs = require('fs'),
	bunyan = require('bunyan'),
	glob = require('glob').sync,
	FirefoxProfile = require('firefox-profile'),
	assert = require('assert');

var log = bunyan.createLogger({
	name: 'APP',
	level: 'fatal'
});

var defaults = function(opts) {
	opts = opts || {};
	opts.log = opts.logger || opts.log || log;
	log = opts.log;

	opts = parseConfigFile(opts);
	opts = parseSelenium(opts);
	opts = parseBrowsers(opts);
	validateOptions(opts);
	return opts;
};

// Trying to fail quickly before starting up selenium
var validateOptions = function(opts) {
	assert(typeof opts.seleniumConfig.hostname !== 'undefined', 'No hostname specified in selenium configuration');
	assert(typeof opts.browserConfig !== 'undefined', 'No browsers sepcified');
}

var parseConfigFile = function(opts) {
	if (opts.configFile) {
		try {
			config = JSON.parse(fs.readFileSync(opts.configFile, 'utf-8'));
			log.debug('Reading configuration from file %s', opts.configFile);
			if (config) {
				for (var key in opts) {
					if (typeof opts[key] !== 'undefined') {
						config[key] = opts[key];
					}
				}
			}
			opts = config;
		} catch (e) {
			log.error('Could not read or parse configuration file %s', opts.configFile, e);
		}
	}
	return opts;
}

var parseSelenium = function(opts) {
	var selenium = opts.selenium || 'localhost:4444';
	if (typeof selenium === 'string') {
		if (!selenium.match(/^http:\/\//)) {
			selenium = 'http://' + selenium
		}
		var seleniumUrl = url.parse(selenium);
		opts.seleniumConfig = {
			hostname: seleniumUrl.hostname,
			port: seleniumUrl.port,
			auth: seleniumUrl.auth
		}
	} else if (typeof selenium === 'object') {
		opts.seleniumConfig = opts.selenium;
	}

	if (typeof opts.username !== 'undefined') {
		opts.seleniumConfig.user = opts.username;
	}

	if (typeof opts.accesskey !== 'undefined') {
		opts.seleniumConfig.pwd = opts.accesskey;
	}

	opts.seleniumConfig.port = parseInt(opts.seleniumConfig.port, 10);

	return opts;
}

var browserConfig = {
	'chrome': {
		browserName: 'chrome',
		chromeOptions: {
			args: ['--disable-popup-blocking', '--enable-gpu-benchmarking', '--enable-thread-composting'],
			extensions: glob(__dirname + '/../*.crx').map(function(file) {
				return fs.readFileSync(file).toString('base64');
			})
		},
		'disable-popup-handler': true
	},
	'firefox': {
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

var parseBrowsers = function(opts) {
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

		// Extension loading for Chrome
		if (passedBrowser.browserName === 'chrome' && opts.debug === true) {
			passedBrowser.debug = true;
			passedBrowser.chromeOptions.args.push('--load-extension=' + __dirname);
			delete passedBrowser.chromeOptions.extensions;
		}
		result.push(passedBrowser);
	});
	opts.browserConfig = result;
	log.trace(opts.browserConfig);
	return opts;
};

module.exports = {
	defaults: defaults,
	validateOptions: validateOptions,
	parseConfigFile: parseConfigFile,
	parseBrowsers: parseBrowsers,
	parseSelenium: parseSelenium,
	browserConfig: browserConfig
}