var expect = require('chai').expect;

var options = require('../../../lib/options');

describe('Options', function() {
	describe('Defaults', function() {
		it('has defaults', function() {
			var res = options.scrub();
			expect(res.browsers.length).to.be.eq(1);
			expect(res.selenium.hostname).to.not.be.undefined;
		})
	});
});