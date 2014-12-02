module.exports = function(cfg) {
	cfg = cfg || {};
	debug = require('debug')('bp:actions:login');
	return function(browser) {
		debug('Loading login form');
		return browser.get(cfg.page).then(function() {
			debug('Filling in Username');
			return browser.elementByCssSelector(cfg.username.field)
		}).then(function(el) {
			return el.type(cfg.username.val || cfg.username.value);
		}).then(function() {
			debug('Filling in Password');
			return browser.elementByCssSelector(cfg.password.field);
		}).then(function(el) {
			return el.type(cfg.password.val || cfg.password.value);
		}).then(function() {
			return browser.elementByCssSelector(cfg.submit.field);
		}).then(function(el) {
			debug('Clicking submit');
			return el.click();
		}).then(function() {
			return browser.sleep(5000);
		});
	}
};