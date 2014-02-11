module.exports = function(cfg) {
	var log = require('../helpers').log();
	return function(browser) {
		log.debug('Loading login form');
		return browser.get(cfg.page).then(function() {
			log.debug('Filling in Username');
			return browser.elementByCssSelector(cfg.username.field)
		}).then(function(el) {
			return el.type(cfg.username.val);
		}).then(function() {
			log.debug('Filling in Password');
			return browser.elementByCssSelector(cfg.password.field);
		}).then(function(el) {
			return el.type(cfg.password.val);
		}).then(function() {
			return browser.elementByCssSelector(cfg.submit.field);
		}).then(function(el) {
			log.debug('Clicking submit');
			return el.click();
		}).then(function() {
			return browser.sleep(5000);
		});
	}
};