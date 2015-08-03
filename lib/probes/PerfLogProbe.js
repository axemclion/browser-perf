var util = require('util'),
	Url = require('url'),
	events = require('events'),
	Q = require('q'),
	request = require('request'),
	JSONStream = require('JSONStream'),
	eventStream = require('event-stream'),
	helpers = require('../helpers'),
	debug = require('debug')('bp:probes:PerfLogProbe');

function PerfLogProbe() {
	events.EventEmitter.call(this);
}

util.inherits(PerfLogProbe, events.EventEmitter);

PerfLogProbe.prototype.id = 'PerfLogProbe';

PerfLogProbe.prototype.setup = function(cfg) {
	var me = this;
	cfg.browsers = cfg.browsers.map(function(browser) {
		helpers.extend(browser, {
			loggingPrefs: {
				performance: 'ALL'
			}
		});
		return browser;
	});
	return Q(cfg);
};

PerfLogProbe.prototype.start = function(browser) {
	var me = this;
	return browser.logTypes().then(function(logs) {
		debug('Supported log types', logs);
		me.enabled = (logs.indexOf('performance') !== -1);
	}).then(function() {
		if (me.enabled) {
			return browser.log('performance');
		}
	});
};

PerfLogProbe.prototype.teardown = function(browser) {
	var me = this;
	if (this.enabled) {
		return Q.promise(function(resolve, reject, notify) {
			var url = [
				browser.configUrl.href,
				browser.configUrl.href.match(/\/$/) ? '' : '/', // making sure the last part of the path doesn't get stripped
				'session/',
				browser.sessionID,
				'/log'
			].join('');

			debug('Getting Performance log', Url.format(url));
			var logStream = request({
				url: url,
				method: 'POST',
				json: {
					type: 'performance'
				}
			}).on('error', reject);

			//logStream.pipe(require('fs').createWriteStream('_perflog.json'));

			logStream.pipe(JSONStream.parse('value.*')).on('error', reject)
				.pipe(eventStream.map(function(data, cb) {
					if (typeof data.message !== 'undefined') {
						// ChromeDriver - format: message: "[{method:'Tracing.dataCollected', params:{cat:...,pid:...}}]"
						cb(null, JSON.parse(data.message).message);
					} else {
						// Appium - format: [{startTime:..., name:..., endTime:...}]
						cb(null, {
							method: 'Timeline.eventRecorded',
							params: data
						});
					}
				})).on('data', function(data) {
					me.emit('data', {
						type: 'perfLog',
						value: data
					});
				}).on('error', reject).on('end', resolve);
		});
	}
};

module.exports = PerfLogProbe;