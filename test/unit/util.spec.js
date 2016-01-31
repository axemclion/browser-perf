var expect = require('chai').expect;
describe('Util', function() {
	it('extend works correctly', function() {
		var e = require('../../lib/helpers').extend;
		expect(e({}, {})).to.deep.equal({});
		expect(e(undefined, {})).to.deep.equal({});

		expect(e({
			a: 1
		}, {
			b: 1
		})).to.deep.equal({
			a: 1,
			b: 1
		});

		expect(e({
			a: 1,
			b: [1, 2]
		}, {
			b: 3
		})).to.deep.equal({
			a: 1,
			b: 3
		});

		expect(e({
			a: 1,
			b: [1, 2]
		}, {
			b: [3]
		})).to.deep.equal({
			a: 1,
			b: [1, 2, 3]
		});

		expect(e({
			a: {
				x: 1,
				y: 1
			},
			b: [10]
		}, {
			a: {
				z: 1
			},
			b: {
				a: 1
			}
		})).to.deep.equal({
			a: {
				x: 1,
				y: 1,
				z: 1
			},
			b: {
				a: 1
			}
		});
		var inlineMod = {
			a: 1
		};
		e(inlineMod, {
			b: 2
		});
		expect(inlineMod).to.deep.equal({
			a: 1,
			b: 2
		});
	});
});