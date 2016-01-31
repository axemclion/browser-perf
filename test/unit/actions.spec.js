var Q = require('q'),
	wd = require('wd'),
	sinon = require('sinon'),
	chai = require("chai"),
	chaiAsPromised = require("chai-as-promised"),
	expect = chai.expect;

chai.use(chaiAsPromised);

var Actions = require('../../lib/actions/index.js');

describe('Actions', function() {
	var browser = wd.remote('localhost:4444'),
		execute = sinon.stub(browser, 'execute').returns(Q.when(1)),
		waitFor = sinon.stub(browser, 'waitFor').returns(Q.when(1)),
		eval = sinon.stub(browser, 'eval').returns(Q(1)),
		sleep = sinon.stub(browser, 'sleep').returns(Q(1)),
		get = sinon.stub(browser, 'get').returns(Q.when(1));

	var click = sinon.stub().returns(Q.when(1)),
		type = sinon.stub().returns(Q.when(1)),
		elementByCssSelector = sinon.stub(browser, 'elementByCssSelector').returns(Q.when({
			click: click,
			type: type
		}));

	function scrollAssertions() {
		expect(execute.calledOnce).to.be.true;
		expect(waitFor.calledOnce).to.be.true;
		execute.reset();
		waitFor.reset();
	}

	it('is passed as strings', function(done) {
		expect(new Actions(['scroll']).perform(browser).then(scrollAssertions)).to.eventually.be.fulfilled.and.notify(done);
	});

	it('should work when more than one action is performed', function(done) {
		expect(new Actions(['scroll', 'scroll']).perform(browser).then(function() {
			expect(execute.calledTwice).to.be.true;
			expect(waitFor.calledTwice).to.be.true;
			execute.reset();
			waitFor.reset();
		})).to.eventually.be.fulfilled.and.notify(done);
	});

	it('performs actions passed as function', function(done) {
		expect(new Actions([Actions.actions.scroll()]).perform(browser).then(scrollAssertions)).to.eventually.be.fulfilled.and.notify(done);
	});

	it('performs actions scroll with params', function(done) {
		expect(new Actions([Actions.actions.scroll({
			direction: 'left',
			pollFreq: 10000
		})]).perform(browser).then(function() {
			expect(waitFor.args[0][0].pollFreq).to.equal(10000);
		}).then(scrollAssertions)).to.eventually.be.fulfilled.and.notify(done);
	});

	it('performs wait action with params', function(done) {
		expect(new Actions([Actions.actions.wait(500)]).perform(browser).then(function() {
			expect(sleep.calledWith(500)).to.be.true;
		})).to.eventually.be.fulfilled.and.notify(done);
	});

	var loginParams = {
		page: 'login.html',
		username: {
			field: 'username',
			val: 'username'
		},
		password: {
			field: 'password',
			val: 'password'
		},
		submit: {
			field: 'submit'
		}
	};

	it('performs login with passed in params', function(done) {
		expect(new Actions([Actions.actions.login(loginParams)]).perform(browser).then(function() {
			expect(elementByCssSelector.args).to.deep.equal([
				[loginParams.username.field],
				[loginParams.password.field],
				[loginParams.submit.field]
			]);
			expect(type.args).to.deep.equal([
				[loginParams.username.val],
				[loginParams.password.val]
			]);
		})).to.eventually.be.fulfilled.and.notify(done);
	});

	it('perfoms login and then scroll', function(done) {
		expect(new Actions([Actions.actions.login(loginParams), 'scroll']).perform(browser).then(function() {
			expect(get.calledBefore(elementByCssSelector)).to.be.true;
			expect(elementByCssSelector.calledBefore(type)).to.be.true;
			expect(type.calledBefore(click)).to.be.true;
			expect(click.calledBefore(waitFor)).to.be.true;
		})).to.eventually.be.fulfilled.and.notify(done);
	});

	it('should work with chrome extensions', function(done) {
		eval.restore();
		eval = sinon.stub(browser, 'eval').returns(Q('true'));
		expect(new Actions([Actions.actions.scroll()]).perform(browser).then(scrollAssertions)).to.eventually.be.fulfilled.and.notify(function() {
			eval.restore();
			eval = sinon.stub(browser, 'eval').returns(Q(1));
			done();
		});
	});
});