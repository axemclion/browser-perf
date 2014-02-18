var log = function() {
	if (typeof global.logger === 'undefined') {
		setLogger(console.log.bind(console));
	}
	return global.logger;
};

var setLogger = function(l) {
	if (typeof l === 'function') {
		var logger = {};
		logger.fatal = logger.error = logger.warn = logger.info = logger.log = logger.debug = l;
		l = logger;
	}
	global.logger = l;
}

var extend = function(obj1, obj2) {
	if (typeof obj1 !== 'object' && !obj1) {
		obj1 = {};
	}
	if (typeof obj2 !== 'object' && !obj2) {
		obj2 = {};
	}
	for (var key in obj2) {
		if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
			obj1[key] = obj1[key].concat(obj2[key]);
		} else if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object' && !Array.isArray(obj1[key]) && !Array.isArray(obj2[key])) {
			obj1[key] = extend(obj1[key], obj2[key]);
		} else {
			obj1[key] = obj2[key];
		}
	}
	return obj1;
}

var metrics = function(value, category, unit, importance, tags) {
	return {
		value: value,
		unit: unit || 'ms',
		category: category,
		tags: tags || [],
		importance: importance || 0
	}
}

metrics.format = function(metric) {
	var res = [metric.value, metric.unit];
	return res.join(' ');
};

metrics.log = function(m) {
	var res = {};
	for (var key in m) {
		res[key] = metrics.format(m[key]);
	}
	return res;
}

var jsmin = require('jsmin').jsmin;
module.exports = {
	fnCall: function(fn, args) {
		args = args || '';
		return '(' + jsmin(fn.toString()) + '(' + args + '));';
	},
	initConstructors: function(arr, modulePath, args) {
		return arr.map(function(item) {
			if (typeof item === 'string') {
				var fn = require('./' + (modulePath || '') + item);
				return new fn(args);
			} else if (typeof item === 'function') {
				return new item(args);
			} else if (typeof item === 'object') {
				return item;
			}
		}).filter(function(item) {
			return (typeof item === 'object')
		});
	},
	metrics: metrics,
	extend: extend,
	setLogger: setLogger,
	log: log
};