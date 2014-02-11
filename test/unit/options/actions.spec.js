var expect = require('chai').expect;

var options = require('../../../lib/options');

describe('Options', function() {
	describe('Actions', function() {
		var test = options.scrub;
		it('default', function() {
			var res = test({});
			expect(res.actions).to.deep.equal(['scroll']);
		});
	});
});