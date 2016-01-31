var expect = require('chai').expect,
	glob = require('glob').sync;

var options = require('../../../lib/options');

describe('Options', function() {
	describe('Config File', function() {
		it('throws an exception when the file does not exist', function() {
			expect(function() {
				options.scrub({
					configFile: 'nosuchfile.ext'
				});
			}).to.throw(Error);
		})
		it('parses selenium local file', function() {
			var res = options.scrub({
				configFile: __dirname + '/../../res/selenium_local.config.json'
			});
		});
	});
});