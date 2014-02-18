var Q = require('q'),
	wd = require('wd'),
	sinon = require('sinon'),
	chai = require("chai"),
	chaiAsPromised = require("chai-as-promised"),
	expect = chai.expect;

chai.use(chaiAsPromised);

var actions = require('../../lib/actions/index.js');

describe('Actions', function() {
	var browser = wd.remote('localhost:4444'),
		execute = sinon.stub(browser, 'execute').returns(Q.when(1)),
		waitFor = sinon.stub(browser, 'waitFor').returns(Q.when(1)),
		eval = sinon.stub(browser, 'eval').returns(Q(1)),
		click = sinon.stub().returns(Q.when(1)),
		type = sinon.stub().returns(Q.when(1)),
		elementByCssSelector = sinon.stub(browser, 'elementByCssSelector').returns(Q.when({
			click: click,
			type: type
		})),

		get = sinon.stub(browser, 'get').returns(Q.when(1));

	sinon.log = require('../../lib/helpers').log();

	function scrollAssertions() {
		expect(execute.calledOnce).to.be.true;
		expect(waitFor.calledOnce).to.be.true;
		execute.reset();
		waitFor.reset();
	}

	it('is passed as strings', function(done) {
		expect(actions.perform(browser, ['scroll']).then(scrollAssertions)).to.eventually.be.fulfilled.and.notify(done);
	});

	it('should work when more than one action is performed', function(done) {
		expect(actions.perform(browser, ['scroll', 'scroll']).then(function() {
			expect(execute.calledTwice).to.be.true;
			expect(waitFor.calledTwice).to.be.true;
			execute.reset();
			waitFor.reset();
		})).to.eventually.be.fulfilled.and.notify(done);
	});

	it('performs actions passed as object', function(done) {
		expect(actions.perform(browser, [actions.actions.scroll()]).then(scrollAssertions)).to.eventually.be.fulfilled.and.notify(done);
	});

	it('perfoms login and then scroll', function(done) {
		expect(actions.perform(browser, [actions.actions.login({
			page: 'login.html',
			username: {
				field: 'username',
				value: 'username'
			},
			password: {
				field: 'password',
				value: 'password'
			},
			submit: {
				field: 'submit'
			}
		}), 'scroll']).then(function() {
			expect(get.calledBefore(elementByCssSelector)).to.be.true;
			expect(elementByCssSelector.calledBefore(type)).to.be.true;
			expect(type.calledBefore(click)).to.be.true;
			expect(click.calledBefore(waitFor)).to.be.true;
		})).to.eventually.be.fulfilled.and.notify(done);
	});

	it('should work with chrome extensions', function(done) {
		eval.restore();
		eval = sinon.stub(browser, 'eval').returns(Q('true'));
		expect(actions.perform(browser, [actions.actions.scroll()]).then(scrollAssertions)).to.eventually.be.fulfilled.and.notify(function() {
			eval.restore();
			eval = sinon.stub(browser, 'eval').returns(Q(1));
			done();
		});
	});
});