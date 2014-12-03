/* Module to be used by other web driver runners like protractor*/
var Metrics = require('./metrics'),
	options = require('./options'),
	helpers = require('./helpers'),
	Q = require('q'),
	debug = require('debug')('bp:selenium:runner'),
	wd = require('wd');

var metrics = null;

function Runner(opts) {
	this.opts = options.scrub(opts);
	this.metrics = null;
	this.browser = null;
};

Runner.prototype.setupMetrics_ = function() {
	var me = this;
	if (this.metrics === null) {
		this.metrics = new Metrics(this.opts.metrics);
		return this.metrics.setup(this.opts);
	} else {
		return Q();
	}
};

Runner.prototype.attachBrowser_ = function(sessionId) {
	if (this.browser === null) {
		this.browser = wd.promiseRemote(this.opts.selenium);
		this.browser.on('status', function(data) {
			//log.debug(data);
		});
		this.browser.on('command', function(meth, path, data) {
			if (data && typeof data === 'object') {
				var data = JSON.stringify(data);
			}
			debug(meth, (path || '').substr(0, 70), (data || '').substr(0, 70));
		});
		return this.browser.attach(sessionId);
	} else {
		return Q();
	}
};

Runner.prototype.config = function(cb) {
	var me = this;
	this.setupMetrics_().then(function() {
		cb(null, me.opts);
	}, function(err) {
		cb(err);
	});
}

Runner.prototype.start = function(sessionId, cb) {
	var me = this;
	if (typeof cb !== 'function') {
		cb = function() {};
	}
	this.setupMetrics_().then(function() {
		return me.attachBrowser_(sessionId);
	}).then(function() {
		me.metrics.start(me.browser).then(cb, cb);
	});
};

Runner.prototype.stop = function(cb) {
	var me = this;
	this.metrics.teardown(this.browser).then(function() {
		return me.metrics.getResults();
	}).then(function(data) {
		cb(undefined, data);
	}, function(err) {
		cb(err, null);
	});
};

module.exports = Runner;