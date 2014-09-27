module.exports = function(cfg) {
	cfg = cfg || {};
	var log = require('../helpers').log('wait');
	return function(browser) {
		log.debug('Waiting for some time');
		return browser.sleep(cfg || 5000);
	}
};