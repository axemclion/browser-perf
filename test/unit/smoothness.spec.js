var expect = require('chai').expect,
	fs = require('fs');
var SmoothnessMetric = require('../../lib/metrics/smoothness.js');

var data = JSON.parse(fs.readFileSync(__dirname + '/../res/tracing.json'));

describe('RenderingStats', function() {
	var metric = new SmoothnessMetric(data);
	var result = {};
	metric.addData(result);
	it('should generate rendering statistics', function() {
		with(result) {
			expect(mean_frame_time).to.be.greaterThan(0);
			expect(jank).to.be.greaterThan(0);
			expect(mostly_smooth).to.be.greaterThan(0);
		}
	});
});