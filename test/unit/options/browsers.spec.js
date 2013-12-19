var expect = require('chai').expect,
	fs = require('fs');

var options = require('../../../lib/options');

describe('Options', function() {
	describe('Browsers', function() {
		var test = options.defaults;
		var conf = {
			chrome: 0,
			firefox: 1
		}

		it('default', function() {
			var res = test({});
			expect(res.browserConfig).deep.equal([options.browserConfig[conf.chrome]]);
		});

		it('single browser as string', function() {
			var res = test({
				browsers: 'chrome'
			});
			expect(res.browserConfig).deep.equal([options.browserConfig[conf.chrome]]);
		});

		it('multiple browsers as strings', function() {
			var res = test({
				browsers: 'chrome,firefox'
			});
			expect(res.browserConfig.length).to.equal(2);
			expect(res.browserConfig[0]).deep.equal(options.browserConfig[conf.chrome]);
			expect(res.browserConfig[1]).deep.equal(options.browserConfig[conf.firefox]);
		});

		it('string array', function() {
			var res = test({
				browsers: ['chrome', 'firefox']
			});
			expect(res.browserConfig.length).to.equal(2);
			expect(res.browserConfig[0]).deep.equal(options.browserConfig[conf.chrome]);
			expect(res.browserConfig[1]).deep.equal(options.browserConfig[conf.firefox]);
		});

		it('object array', function() {
			var res = test({
				browsers: [{
					browserName: 'chrome'
				}, {
					browserName: 'firefox'
				}]
			});
			expect(res.browserConfig.length).to.equal(2);
			expect(res.browserConfig[0]).deep.equal(options.browserConfig[conf.chrome]);
			expect(res.browserConfig[1]).deep.equal(options.browserConfig[conf.firefox]);
		});

		it('respect debug flag', function() {
			var res = test({
				debug: true,
				browser: 'chrome'
			});
			expect(res.browserConfig.length).to.eq(1);
			expect(res.browserConfig[0].debug).to.eq(true);
			expect(res.browserConfig[0].extensions).to.be.undefined;
			var arg = res.browserConfig[0].chromeOptions.args[res.browserConfig[0].chromeOptions.args.length - 1]
			expect(arg).to.match(/--load-extension=/);
		})

	});
});