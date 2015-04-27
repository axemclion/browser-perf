var Q = require('q'),
	wd = require('wd'),
	Actions = require('./actions'),
	Metrics = require('./metrics'),
	helpers = require('./helpers');

var debug = require('debug'),
	log = debug('bp:index'),
	seleniumLog = debug('bp:selenium');

function main(url, cb, cfg) {
	var opts = require('./options').scrub(cfg),
		errors = [],
		results = [];
	var res = [],
		err = [];
	opts.browsers.map(function(browserConfig) {
		return function() {
			return runOnBrowser(url, browserConfig, opts).then(function(data) {
				data._browserName = browserConfig.browserName;
				data._url = url;
				res.push(data);
			}, function(error) {
				err.push(error);
			});
		}
	}).reduce(Q.when, Q()).then(function() {
		cb(err.length === 0 ? undefined : err, res);
	}, function(err) {
		cb(err);
	}).done();
}


function runOnBrowser(url, browserConfig, opts) {
	browser = wd.promiseRemote(opts.selenium);
	log('Selenium is on %s', browser.noAuthConfigUrl.hostname);
	browser.on('status', function(data) {
		//seleniumLog(data);
	});
	browser.on('command', function(meth, path, data) {
		if (data && typeof data === 'object') {
			var data = JSON.stringify(data);
		}
		seleniumLog(meth, (path || '').substr(0, 70), (data || '').substr(0, 70));
	});

	var metrics = new Metrics(opts.metrics);
	var actions = new Actions(opts.actions);

	return metrics.setup(opts).then(function() {
		return actions.setup(opts);
	}).then(function() {
		log('Stating browser with', JSON.stringify(browserConfig));
		return browser.init(browserConfig);
	}).then(function() {
		log('Session is ' + browser.sessionID);
		log('Running Prescript');
		return opts.preScript(browser);
	}).then(function() {
		if (url) {
			return browser.get(url);
		}
	}).then(function() {
		return metrics.start(browser);
	}).then(function() {
		return actions.perform(browser);
	}).then(function() {
		return metrics.teardown(browser);
	}).then(function() {
		return metrics.getResults();
	}).fin(function() {
		if (!opts.debugBrowser) {
			return browser.quit().catch(function() {
				return Q();
			});
		}
	});
}

module.exports = main;
module.exports.actions = Actions.actions;
module.exports.runner = require('./runner');
module.exports.docs = require('../docs');