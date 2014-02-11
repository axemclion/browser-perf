var Q = require('q'),
	sinon = require('sinon'),
	chai = require("chai"),
	util = require('util'),
	events = require('events')
	chaiAsPromised = require("chai-as-promised"),
	expect = chai.expect;

chai.use(chaiAsPromised);

describe('Metrics', function() {
	var Metrics = require('../../lib/metrics'),
		SampleMetric = require('../../lib/metrics/SampleMetric'),
		SampleProbe = require('../../lib/probes/SampleProbe');

	describe('Passing metrics', function() {
		it('Accepts string metrics', function(done) {
			var metrics = new Metrics(['SampleMetric']);
			expect(metrics.metrics.length).to.eq(1);
			expect(metrics.metrics[0].id).to.eq('SampleMetrics');

			metrics.setup().then(function() {
				expect(metrics.metrics[0].probes.length).to.eq(1);
				expect(metrics.metrics[0].activeProbes[0].id).to.eq('SampleProbe');
				done();
			});
		});

		it('Accepts probes in metrics', function(done) {
			var metrics = new Metrics([new SampleMetric({
				probes: ['SampleProbe', new SampleProbe()]
			})]);
			expect(metrics.metrics.length).to.eq(1);
			expect(metrics.metrics[0].id).to.eq('SampleMetrics');

			metrics.setup().then(function() {
				expect(metrics.metrics[0].probes.length).to.eq(2);
				expect(metrics.metrics[0].activeProbes[0].id).to.eq('SampleProbe');
				expect(metrics.metrics[0].activeProbes[1].id).to.eq('SampleProbe');
				done();
			});
		});
	});

	xdescribe('Browser Support', function() {
		it('Works on all supported browsers', function() {
			var sampleMetric = new SampleMetric({
				probes: ['SampleProbe', new SampleProbe()]
			});
			sampleMetric.browsers = ['chrome', 'firefox'];

			var metrics = new Metrics([sampleMetric], [{
				browserName: 'firefox'
			}, {
				browserName: 'chrome'
			}]);
			expect(metrics.metrics.length).to.eq(1);
		});

		it('Works if even one browser is supported', function() {
			var sampleMetric = new SampleMetric();
			sampleMetric.browsers = ['chrome', 'firefox'];

			var metrics = new Metrics([sampleMetric], [{
				browserName: 'chrome'
			}]);
			expect(metrics.metrics.length).to.eq(1);
		});

		it('Does not start metrics for unsupported browsers', function() {
			var sampleMetric = new SampleMetric({
				probes: ['SampleProbe', new SampleProbe()]
			});
			sampleMetric.browsers = ['firefox'];

			var metrics = new Metrics([sampleMetric], [{
				browserName: 'chrome'
			}]);
			expect(metrics.metrics.length).to.eq(0);
		});

		it('Works when no browsers are specified', function() {
			var sampleMetric = new SampleMetric({
				probes: ['SampleProbe', new SampleProbe()]
			});

			var metrics = new Metrics([sampleMetric], [{
				browserName: 'chrome'
			}]);
			expect(metrics.metrics.length).to.eq(1);
		});

		it('Works when no browserConfig is specified', function() {
			var sampleMetric = new SampleMetric({
				probes: ['SampleProbe', new SampleProbe()]
			});

			var metrics = new Metrics([sampleMetric]);
			expect(metrics.metrics.length).to.eq(1);
		});

		describe('Probes on Supported browsers', function() {
			it('Should be enabled on supported browsers only', function(done) {
				var probe = new SampleProbe();
				probe.browsers = ['chrome'];
				var sampleMetric = new SampleMetric({
					probes: [probe]
				});

				var metrics = new Metrics([sampleMetric]);

				metrics.setup().then(function() {
					expect(metrics.metrics[0].activeProbes.length).to.eq(1);
					expect(metrics.metrics[0].activeProbes[0].id).to.eq(probe.id);
					done();
				});
			});
		});
	});

	it('Runs the lifecycle of metrics', function(done) {
		var probe = new SampleProbe(),
			metric = new SampleMetric({
				probes: [probe]
			});

		var spyProbe = {}, spyMetric = {};

		['setup', 'start', 'teardown'].forEach(function(method) {
			spyProbe[method] = sinon.spy(probe, method);
		});

		['setup', 'teardown', 'start', 'getResults', 'onData'].forEach(function(method) {
			spyMetric[method] = sinon.spy(metric, method);
		});

		var data = new Metrics([metric]);
		expect(data.setup().then(function() {
			return data.start();
		}).then(function() {
			return Q.delay(50);
		}).then(function() {
			return data.teardown();
		}).then(function() {
			return data.getResults();
		}).then(function(res) {
			[
				spyMetric.setup, spyProbe.setup,
				spyMetric.start, spyProbe.start,
				spyMetric.onData,
				spyMetric.teardown, spyProbe.teardown,
				spyMetric.getResults
			].reduce(function(prev, curr) {
				if (prev)
					expect(prev.calledBefore(curr)).to.be.true;
			});
		})).to.eventually.be.fulfilled.and.notify(done);
	});

	it('Runs metrics only on supported browsers', function() {

	});
});