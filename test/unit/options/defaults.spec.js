var expect = require('chai').expect;

var options = require('../../../lib/options');

describe('Options', function() {
	describe('Defaults', function() {
		it('has defaults', function() {
			var res = options.defaults();
			expect(res.log).to.not.be.undefined;
			expect(res.browserConfig.length).to.be.eq(1);
			expect(res.seleniumConfig.hostname).to.not.be.undefined;
		})
	});
});