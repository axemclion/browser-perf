module.exports = function(browser, cb) {
	browser.get('http://localhost:9000/login.html', function() {
		browser.elementById('signin-email', function(err, el) {
			el.type('username', function() {
				browser.elementById('signin-password', function(err, el) {
					el.type('password', function() {
						browser.elementByCssSelector('.js-submit', function(err, el) {
							el.click(function(err) {
								browser.sleep(5000, function() {
									cb(null, true);
								})
							});
						});
					});
				});
			});
		});
	});
};