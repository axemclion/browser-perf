var wd = require('wd'),
	browserPerf = require('../../'),
	url = require('url'),
	chai = require("chai");

chai.should();


describe('Runner', function() {
	var config = {
		host: process.env.SELENIUM || 'http://localhost:4444/wd/hub',
		username: process.env.USERNAME,
		accesskey: process.env.ACCESSKEY
	};

	var capabilities = {
		browserName: 'chrome',
		version: 32
	}

	var seleniumAddress = url.parse(config.host);
	var browser = wd.remote(seleniumAddress.hostname, seleniumAddress.port, config.username, config.accesskey);

	var runner = new browserPerf.runner({
		selenium: config.host,
		username: config.username,
		accesskey: config.accesskey,
	});

	it('should be run via a runner inside another test case', function(done) {
		runner.config(function(err, cfg) { // Call this before starting anything
			var capabilities = cfg.browsers[0];
			browser.init(capabilities, function() {
				runner.start(browser.getSessionId(), function() { // call this as soon as the browser is available
					browser.get("http://admc.io/wd/test-pages/guinea-pig.html", function() {
						browser.title(function(err, title) {
							title.should.include('WD');
							browser.elementById('i am a link', function(err, el) {
								browser.clickElement(el, function() {
									browser.eval("window.location.href", function(err, href) {
										href.should.include('guinea-pig2');
										runner.stop(function(err, res) { // call this before closing the browser
											browser.quit();
											done();
										});
									});
								});
							});
						});
					})
				})
			});
		});
	});
})