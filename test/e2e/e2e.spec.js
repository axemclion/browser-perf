var expect = require('chai').expect,
	debug = require('debug')('bp:test:e2e'),
	browserPerf = require('../../');

var expectedMetrics = {
	chrome: [
		// ChromeTracingMetrics & RafRenderingMetrics
		'mean_frame_time',
		'meanFrameTime_raf',

		// Network Timings
		'firstPaint',
		'connectStart',
		'domainLookupStart',
		'domComplete',
		'domInteractive',
		'domLoading',
		'fetchStart',
		'navigationStart',

		// RuntimePerfMetrics
		'ExpensiveEventHandlers',
		'ExpensivePaints',
		'Layers',
		'NodePerLayout_avg',
		'PaintedArea_avg',
		'PaintedArea_total',
		'framesPerSec (devtools)',
		'Styles',
		'Javascript',

		// TimelineMetrics
		'Decode Image',
		'CompositeLayers',
		'Layout',
		'Paint',
		//'RecalculateStyles',
		//'EvaluateScript',
		//'EventDispatch',
		'FireAnimationFrame',
		'FunctionCall',
		//'GCEvent',
		//'XHRReadyStateChange',
		'UpdateLayerTree'
	],
	firefox: [
		'meanFrameTime_raf',
		// Network Timings
		'connectStart',
		'domainLookupStart',
		'domComplete',
		'domInteractive',
		'domLoading',
		'fetchStart',
		'navigationStart',
	]
};

describe('End To End Test Cases', function() {
	it('fails if selenium is not running', function(done) {
		this.timeout(60*1000);
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
		this.timeout(10 * 60 * 1000); // 10 minutes for E2E tests
		it('should work for a sample page', function(done) {
			var url = 'http://nparashuram.com/perfslides/';
			browserPerf(url, function(err, res) {
				if (err) {
					console.log(err);
				}
				expect(err).to.be.empty;
				expect(res).to.not.be.empty;
				res.forEach(function(data) {
					expect(data._url).to.equal(url);
					debug('Testing', data._browserName);
					expect(data).to.include.keys(expectedMetrics[data._browserName]);
				});
				done();
			}, {
				selenium: process.env.SELENIUM || 'http://localhost:4444/wd/hub',
				username: process.env.USERNAME,
				accesskey: process.env.ACCESSKEY,
				browsers: [{
					browserName: 'chrome',
					version: 49,
					name: 'Browserperf-E2E Tests'
				}, {
					browserName: 'firefox',
					version: 44,
					name: 'Browserperf-E2E Tests'
				}]
			});
		});
	});
});