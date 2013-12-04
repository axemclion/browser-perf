var wd = require('wd'),
	glob = require('glob').sync,
	fs = require('fs'),
	bunyan = require('bunyan'),
	jsmin = require('jsmin').jsmin;

module.exports = function(url, cb, opts) {
	opts = opts || {};
	var selenium = opts.selenium || 'http://localhost:4444/wd/hub';
	var logger = opts.logger || bunyan.createLogger({
		name: 'index.js',
		level: debug,
		stream: stdout
	});

	var scripts = [];
	[
		'scroll.js',
		'smoothness_measurement.js',
		'benchmarks.js',
		'runner.js'
	].forEach(function(file) {
		scripts.push(jsmin(fs.readFileSync(__dirname + '/scripts/' + file, {
			encoding: 'utf-8'
		})).replace(/\'use strict\'/, ''));
	});

	var browser = wd.promiseRemote(selenium);
	browser.on('status', function(info) {
		logger.debug(info);
	});
	browser.on('command', function(meth, path, data) {
		logger.debug(' > ', meth, path, data || '');
	});

	browser.init({
		browserName: 'chrome'
	}).then(function() {
		return browser.get(url);
	}).then(function() {
		return browser.execute(scripts.join(' '));
	}).then(function() {
		return browser.sleep(10000)
	}).then(function() {
		return browser.waitForConditionInBrowser("typeof window.__telemetryData__ !== 'undefined'", 1000 * 60 * 10, 1000);
	}).then(function() {
		return browser.eval('window.__telemetryData__');
	}).then(function(data) {
		cb(data);
	}).fin(function() {
		return browser.quit();
	}).done();
}