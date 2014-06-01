var expect = require('chai').expect,
	browserPerf = require('../../'),
	testHelper = require('../test.helper.js');

describe('End To End Test Cases', function() {
	it('fails if selenium is not running', function(done) {
		browserPerf('http://google.com', function(err, res) {
			expect(err).to.not.be.null;
			expect(err).to.not.be.empty;
			expect(res).to.be.empty;
			done();
		}, {
			selenium: 'nohost:4444'
		});
	});

	describe('gets enough statistics from browsers', function() {
		it('should work for a sample page', function(done) {
			browserPerf('http://nparashuram.com/perfslides/', function(err, res) {
				if (err) {
					console.log(err);
				}
				testHelper.checkMetrics(res);
				expect(err).to.be.empty;
				expect(res).to.not.be.empty;
				done();
			}, {
				selenium: process.env.SELENIUM || 'http://localhost:4444/wd/hub',
				username: process.env.USERNAME,
				accesskey: process.env.ACCESSKEY,
				browsers: [{
					browserName: 'chrome',
					version: 34,
					name: 'e2e.spec.js'
				}, {
					browserName: 'firefox',
					name: 'e2e.spec.js'
				}]
			});
		});
	});
});