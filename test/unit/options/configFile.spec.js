var expect = require('chai').expect,
	glob = require('glob').sync;

var options = require('../../../lib/options');

describe('Options', function() {
	describe('Config File', function() {
		it('has defaults on bad config file', function() {
			var res = options.scrub({
				configFile: 'nosuchfile.ext'
			});
			expect(res.browsers.length).to.be.eq(1);
			expect(res.selenium.hostname).to.not.be.undefined;
		})
		it('parses selenium local file', function() {
			var res = options.scrub({
				configFile: __dirname + '/../../res/selenium_local.config.json'
			});
		});
	});
});