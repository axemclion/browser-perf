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

	describe('Metrics and Probes Lifecycle', function() {
		function testOrder() {
			var arr = Array.prototype.slice.call(arguments, 0);
			for (var i = 1; i < arr.length; i++) {
				expect(arr[i - 1].calledBefore(arr[i])).to.be.true;
			}
		}

		function getSpies(item, arr) {
			var res = {};
			arr.forEach(function(a) {
				res[a] = sinon.spy(item, a);
			});
			return res;
		}

		it('should have correct lifecycle for single probe and metric', function(done) {
			var probe = new SampleProbe(),
				metric = new SampleMetric([probe]),
				spyProbe = getSpies(probe, ['setup', 'start', 'teardown']),
				spyMetric = getSpies(metric, ['setup', 'start', 'teardown', 'onData', 'getResults']);

			var metrics = new Metrics([metric]);
			expect(metrics.setup().then(function() {
				return metrics.start();
			}).then(function() {
				return Q.delay(50);
			}).then(function() {
				return metrics.teardown();
			}).then(function() {
				return metrics.getResults();
			}).then(function(res) {
				testOrder(
					spyMetric.setup, spyProbe.setup,
					spyMetric.start, spyProbe.start,
					spyMetric.onData,
					spyProbe.teardown, spyMetric.teardown,
					spyMetric.getResults
				);
			})).to.eventually.be.fulfilled.and.notify(done);
		});


		it('should have correct lifecycle for multiple probes and metric', function(done) {
			var probe1 = new SampleProbe('probe1'),
				probe2 = new SampleProbe('probe2'),
				metric = new SampleMetric([probe1, probe2]),
				spyProbe1 = getSpies(probe1, ['setup', 'start', 'teardown']),
				spyProbe2 = getSpies(probe2, ['setup', 'start', 'teardown']),
				spyMetric = getSpies(metric, ['setup', 'start', 'teardown', 'onData', 'getResults']);

			var metrics = new Metrics([metric]);
			expect(metrics.setup().then(function() {
				return metrics.start();
			}).then(function() {
				return Q.delay(50);
			}).then(function() {
				return metrics.teardown();
			}).then(function() {
				return metrics.getResults();
			}).then(function(res) {
				testOrder(
					spyMetric.setup, spyProbe1.setup, spyProbe2.setup,
					spyMetric.start, spyProbe1.start, spyProbe2.start,
					spyProbe1.teardown, spyProbe2.teardown, spyMetric.teardown,
					spyMetric.getResults
				);
			})).to.eventually.be.fulfilled.and.notify(done);
		});

		it('should call shared probes only once', function(done) {
			var probe = new SampleProbe('probe'),
				metric1 = new SampleMetric([probe]),
				metric2 = new SampleMetric([probe]),
				spyProbe = getSpies(probe, ['setup', 'start', 'teardown']),
				spyMetric1 = getSpies(metric1, ['setup', 'start', 'teardown', 'onData', 'getResults']),
				spyMetric2 = getSpies(metric2, ['setup', 'start', 'teardown', 'onData', 'getResults']);

			var metrics = new Metrics([metric1, metric2]);
			expect(metrics.setup().then(function() {
				return metrics.start();
			}).then(function() {
				return Q.delay(50);
			}).then(function() {
				return metrics.teardown();
			}).then(function() {
				return metrics.getResults();
			}).then(function(res) {
				testOrder(
					spyMetric1.setup, spyMetric2.setup, spyProbe.setup,
					spyMetric1.start, spyMetric2.start, spyProbe.start,
					spyMetric1.onData, spyMetric2.onData,
					spyProbe.teardown, spyMetric1.teardown, spyMetric2.teardown
				);
				expect(spyProbe.setup.calledOnce).to.be.true;
				expect(spyProbe.teardown.calledOnce).to.be.true;
				expect(spyProbe.start.calledOnce).to.be.true;
			})).to.eventually.be.fulfilled.and.notify(done);
		});
	});
});