var expect = require('chai').expect,
	glob = require("glob").sync,
	fs = require('fs'),
	path = require('path'),
	markdown = require('markdown').markdown,
	browserPerf = require('../../');

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
		before(function() {
			fs.mkdirSync(__dirname + '/../../tmp');
		});
		glob(__dirname + '/../../*.md').forEach(function(file) {
			it('should work for ' + path.basename(file), function(done) {
				var filename = path.basename(file);
				var html = markdown.toHTML(fs.readFileSync(file, 'utf-8'));
				fs.writeFileSync(__dirname + '/../../tmp/' + filename + '.html', [html, html, html].join());

				browserPerf('http://localhost:9000/tmp/' + filename + '.html', function(err, res) {
					if (err) {
						console.log(err);
					}
					expect(err).to.be.empty;
					expect(res).to.not.be.empty;
					done();
				}, {
					selenium: 'localhost:4444/wd/hub',
					browsers: [{
						browserName: 'firefox'
					}]
				});
			});
		});
	});
});