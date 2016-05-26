var Q = require('q'),
    chai = require("chai"),
    chaiAsPromised = require("chai-as-promised"),
    expect = chai.expect;

var helpers = require('../../lib/helpers');

chai.use(chaiAsPromised);

describe('Helpers', function () {

    describe('deepEquals', function () {
        it('should check objects correctly', function () {
            var de = helpers.deepEquals;

            expect(de(undefined, 'a.b.c', 1)).to.be.false;
            expect(de(null, 'a.b.c', 1)).to.be.false;
            expect(de([], 'a', 1)).to.be.false;
            expect(de({ a: 1 }, 'a', 1)).to.be.true;
            expect(de({ a: { b: 1 } }, 'a.b', 1)).to.be.true;
            expect(de({ a: [1, 2] }, 'a.b', 2)).to.be.false;
            expect(de({}, 'browserName', 'chrome')).to.be.false;
            expect(de({ browserName: 'chrome' }, 'browserName', 'chrome')).to.be.true;
            expect(de({ browserName: 'chrome', chromeOptions: { activity: 'com.android.chrome' } }, 'chromeOptions.activity', 'com.android.chrome')).to.be.true;
            expect(de({ browserName: 'chrome' }, 'chromeOptions.activity', 'com.android.chrome')).to.be.false;
        });
    });
});