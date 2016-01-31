var chai = require("chai"),
	expect = chai.expect;

var Docs = require('../../docs');

describe('Metric Docs', function() {

	it('should return docs for specific source', function() {
		var apiDocs = new Docs('TimelineMetrics');
		expect(apiDocs.metrics).to.not.be.empty;
		for (var key in apiDocs.metrics) {
			expect(apiDocs.metrics[key].source).to.equal('TimelineMetrics');
		}
	});

	it('should return docs for source when specified as array', function() {
		var apiDocs = new Docs(['TimelineMetrics', 'NetworkTimings']);
		expect(apiDocs.metrics).to.not.be.empty;
		var result = apiDocs.metrics;
		for (var key in result) {
			expect(result[key].source == 'TimelineMetrics' || result[key].source == 'NetworkTimings').to.be.true;
		}
	});

	it('should return docs for a specific metric', function() {
		var apiDocs = new Docs();
		var result = apiDocs.get('meanFrameTime_raf')
		expect(result).to.contain.keys(['type', 'unit', 'summary', 'details', 'source', 'tags']);
		expect(result.source).to.equal('RafRenderingStats');
	});

	it('should return empty object for unmatched metric', function() {
		var apiDocs = new Docs();
		var result = apiDocs.get('UNAVAILABLE_METRIC');
		expect(result).to.be.empty;
	});

	it('should get a specific property for a metric', function() {
		var apiDocs = new Docs();
		expect(apiDocs.getProp('meanFrameTime_raf', 'unit')).to.equal('ms');
	});

	it('should get a specific property for an undefined metric', function() {
		var apiDocs = new Docs();
		expect(apiDocs.getProp('UNAVAILABLE', 'unit')).to.be.undefined;
	});
});