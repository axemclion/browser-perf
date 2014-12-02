var Q = require('q');

var builtInActions = {
	scroll: require('./scrollAction.js'),
	login: require('./loginAction.js'),
	wait: require('./wait.js')
};

var Actions = function(actionList) {
	var emptyAction = function() {
		return Q();
	};
	this.actionList = actionList.map(function(action) {
		if (typeof action === 'string' && builtInActions[action] !== 'undefined') {
			return builtInActions[action]();
		} else if (typeof action === 'function') {
			return action;
		} else {
			throw 'Could not find action ' + action;
		}
	});
};

Actions.prototype.forEachAction_ = function(cb) {
	return this.actionList.map(function(action) {
		return function() {
			return cb(action);
		}
	}).reduce(Q.when, Q());
};

Actions.prototype.setup = function(cfg) {
	return this.forEachAction_(function(action) {
		if (typeof action.setup === 'function') {
			return action.setup(cfg);
		} else {
			return Q();
		}
	});
};

Actions.prototype.perform = function(browser) {
	return this.forEachAction_(function(action) {
		return action(browser);
	});
};

module.exports = Actions;
module.exports.actions = builtInActions;