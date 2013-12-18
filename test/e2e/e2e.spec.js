var expect = require('chai').expect,
	glob = require("glob").sync,
	bunyan = require('bunyan'),
	bformat = require('bunyan-format'),
	browserPerf = require('../../');

var testPages = __dirname + '/../res/',
	selenium = 'http://localhost:4444/wd/hub',
	log = bunyan.createLogger({
		name: 'test',
		level: 'debug',
		streams: [{
			path: 'test.log',
		}]
	});

function fileName(file) {
	return 'http://localhost:9000' + file.substr(file.lastIndexOf('\/'));
}

describe('EndToEnd', function() {
	it('fails if selenium is not running', function(done) {
		browserPerf('http://google.com', function(err, res) {
			expect(err).to.not.be.null;
			expect(err).to.not.be.empty;
			expect(res).to.be.empty;
			done();
		}, {
			selenium: 'nohost:4444',
			logger: log
		});
	});

	describe('gets enough statistics from browsers', function() {
		glob(testPages + '**/*.html').forEach(function(file) {
			var url = fileName(file);
			it('for ' + url, function(done) {
				browserPerf(url, function(err, results) {
					expect(err).to.be.null;
					for (var i = 0; i < results.length; i++) {
						with(results[i]) {
							expect(first_paint).to.be.greaterThan(0);
							expect(mean_frame_time).to.be.greaterThan(0);
							expect(load_time_ms).to.be.greaterThan(0);
							expect(dom_content_loaded_time_ms).to.be.greaterThan(0);
						}
					}
					done();
				}, {
					logger: log,
					selenium: selenium,
					browsers: ['chrome', 'firefox']
				});
			});
		});
	});
});