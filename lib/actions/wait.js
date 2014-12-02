module.exports = function(cfg) {
	cfg = cfg || {};
	var debug = require('debug')('bp:actions:wait');
	return function(browser) {
		var duration = cfg || 5000;
		debug('Waiting for some time - %d', duration);
		return browser.sleep(duration);
	}
};