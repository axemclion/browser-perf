var expect = require('chai').expect,
	fs = require('fs');

var options = require('../../../lib/options');

describe('Options', function() {
	var test = options.defaults;
	describe('Selenium', function() {
		it('have defaults for selenium', function() {
			var res = test({}).seleniumConfig
			expect(res.hostname).to.equal('localhost');
			expect(res.port).to.equal(4444);
			expect(res.user).to.be.undefined;
			expect(res.pwd).to.be.undefined;
		});

		it('parse simple string configurations', function() {
			var res = test({
				selenium: 'localhost:4444'
			}).seleniumConfig;
			expect(res.hostname).to.equal('localhost');
			expect(res.port).to.equal(4444);
			expect(res.user).to.be.undefined;
			expect(res.pwd).to.be.undefined;
		});

		it('parse string configurations', function() {
			var res = test({
				selenium: 'http://localhost:4444'
			}).seleniumConfig;
			expect(res.hostname).to.equal('localhost');
			expect(res.port).to.equal(4444);
			expect(res.user).to.be.undefined;
			expect(res.pwd).to.be.undefined;

		});

		it('parse object configurations', function() {
			var res = test({
				selenium: {
					hostname: 'localhost',
					port: 4444
				}
			}).seleniumConfig;
			expect(res.hostname).to.equal('localhost');
			expect(res.port).to.equal(4444);
			expect(res.user).to.be.undefined;
			expect(res.pwd).to.be.undefined;

		});

		it('parse Saucelabs configuration', function() {
			var res = test({
				selenium: 'ondemand.saucelabs.com:80',
				username: 'sauceuser',
				accesskey: 'saucekey'
			}).seleniumConfig
			expect(res.hostname).to.equal('ondemand.saucelabs.com');
			expect(res.port).to.equal(80);
			expect(res.user).to.equal('sauceuser');
			expect(res.pwd).to.equal('saucekey');

		});
	});
});