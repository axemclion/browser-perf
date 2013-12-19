var expect = require('chai').expect,
	glob = require('glob').sync;

var options = require('../../../lib/options');

describe('Options', function() {
	describe('Config File', function() {
		it('has defaults on bad config file', function() {
			var res = options.defaults({
				configFile: 'nosuchfile.ext'
			});
			expect(res.browserConfig.length).to.be.eq(1);
			expect(res.seleniumConfig.hostname).to.not.be.undefined;
		})
		it('parses selenium local file', function() {
			var res = options.defaults({
				configFile: __dirname + '/../../res/selenium_local.config.json'
			});
		});
	});
});