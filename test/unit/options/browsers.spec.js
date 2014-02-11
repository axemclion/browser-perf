var expect = require('chai').expect,
	fs = require('fs');

var options = require('../../../lib/options');

describe('Options', function() {
	describe('Browsers', function() {
		var test = options.scrub;

		it('default', function() {
			var res = test({});
			expect(res.browsers).deep.equal([{
				browserName: 'chrome'
			}]);
		});

		it('single browser as string', function() {
			var res = test({
				browsers: 'chrome'
			});
			expect(res.browsers).deep.equal([{
				browserName: 'chrome'
			}]);
		});

		it('multiple browsers as strings', function() {
			var res = test({
				browsers: 'chrome,firefox'
			});
			expect(res.browsers.length).to.equal(2);
			expect(res.browsers).deep.equal([{
				browserName: 'chrome'
			}, {
				browserName: 'firefox'
			}]);
		});

		it('string array', function() {
			var res = test({
				browsers: ['chrome', 'firefox']
			});
			expect(res.browsers.length).to.equal(2);
			expect(res.browsers).deep.equal([{
				browserName: 'chrome'
			}, {
				browserName: 'firefox'
			}]);
		});

		it('object array', function() {
			var cfg = [{
				browserName: 'chrome'
			}, {
				browserName: 'firefox'
			}]
			var res = test({
				browsers: cfg
			});
			expect(res.browsers.length).to.equal(2);
			expect(res.browsers).deep.equal(cfg);
		});

		it('should parse browserstack credentials', function() {
			var res = test({
				browser: ['chrome', 'firefox'],
				BROWSERSTACK_USERNAME: 'username',
				BROWSERSTACK_KEY: 'key'
			});
			expect(res.browsers.length).to.eq(2);
			expect(res.browsers[0]['browserstack.user']).to.eq('username');
			expect(res.browsers[0]['browserstack.key']).to.eq('key');
			expect(res.browsers[1]['browserstack.user']).to.eq('username');
			expect(res.browsers[1]['browserstack.key']).to.eq('key');
		});

		it('should parse saucelabs credentials', function() {
			var res = test({
				browser: 'chrome',
				SAUCE_USERNAME: 'username',
				SAUCE_ACCESSKEY: 'key'
			});
			expect(res.browsers.length).to.eq(1);
			expect(res.selenium.username).to.eq('username');
			expect(res.selenium.pwd).to.eq('key');
		});
	});
});