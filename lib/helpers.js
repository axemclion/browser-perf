var log = (function() {
	var logger = {},
		noop = function() {},
		logMethods = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
		setLogger = function(setter) {
			logMethods.forEach(function(method) {
				if (typeof setter === 'function') {
					logger[method] = setter;
				} else if (typeof setter[method] === 'function') {
					logger[method] = setter[method].bind(setter);
				} else {
					logger[method] = noop;
				}
			});
		};

	setLogger({});

	return function(setter) {
		if (typeof setter === 'object' || typeof setter === 'function') {
			setLogger(setter);
			return logger;
		} else if (typeof setter === 'string') {
			var res = {};
			logMethods.forEach(function(method) {
				res[method] = function() {
					logger[method].apply(logger, [setter + ':'].concat(Array.prototype.slice.call(arguments, 0)));
				}
			});
			return res;
		} else {
			return logger;
		}
	}
}());

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

var metrics = function(value, category, source, unit, importance, tags) {
	return {
		value: value,
		unit: unit || 'ms',
		category: category,
		source: source,
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
		if (typeof args === 'object') {
			args = JSON.stringify(args);
		}
		return '(' + jsmin(fn.toString()) + '(' + args + '));';
	},
	metrics: metrics,
	extend: extend,
	log: log
};