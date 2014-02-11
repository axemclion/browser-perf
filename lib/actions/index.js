var builtInActions = {
	scroll: require('./scrollAction.js'),
	login: require('./loginAction.js')
};
var Q = require('q'),
	log = require('../helpers').log('actions');

module.exports = {
	perform: function(browser, actions) {
		return actions.map(function(action) {
			if (typeof action === 'string' && builtInActions[action] !== 'undefined') {
				action = builtInActions[action]();
			}
			return function() {
				return action(browser);
			}
		}).reduce(Q.when, Q());
	},
	actions: builtInActions
};