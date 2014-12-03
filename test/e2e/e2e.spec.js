var expect = require('chai').expect,
	glob = require('glob'),
	fs = require('fs'),
	path = require('path'),
	debug = require('debug')('bp:test:e2e'),
	browserPerf = require('../../');

var browsers = [{
	browserName: 'chrome',
	version: 39,
	name: 'e2e.spec.js'
}, {
	browserName: 'firefox',
	version: 33,
	name: 'e2e.spec.js'
}];

var browserVersions = {};
browsers.forEach(function(b) {
	browserVersions[b.browserName] = b.version;
});

var metrics = {};
glob.sync('*.json', {
	cwd: path.resolve(__dirname, '../../docs')
}).forEach(function(filename) {
	var data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../docs', filename)));
	for (var key in data) {
		if (Array.isArray(data[key].browsers)) {
			data[key].browsers.forEach(function(browser) {
				if (typeof metrics[browser] === 'undefined') {
					metrics[browser] = [];
				}
				if (!(data[key].deprecated && data[key].deprecated[browser] <= browserVersions[browser])) {
					metrics[browser].push(key);
				}
			});
		}
	}
});

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
		var url = 'http://nparashuram.com/perfslides/';
		it('should work for a sample page', function(done) {
			browserPerf(url, function(err, res) {
				if (err) {
					console.log(err);
				}
				expect(err).to.be.empty;
				expect(res).to.not.be.empty;
				res.forEach(function(data) {
					expect(data._url).to.equal(url);
					debug('Testing', data._browserName);
					expect(data).to.include.keys(metrics[data._browserName]);
				});
				done();
			}, {
				selenium: process.env.SELENIUM || 'http://localhost:4444/wd/hub',
				username: process.env.USERNAME,
				accesskey: process.env.ACCESSKEY,
				browsers: browsers
			});
		});
	});
});