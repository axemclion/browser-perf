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

var deepEquals = function(global, prop, val) {
	var props = prop.split('.');
	for (var i = 0; i < props.length; i++) {
		if (typeof global[props[i]] === 'undefined') {
			return false;
		}
		global = global[props[i]];
	}
	return global === val;
};

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
	deepEquals: deepEquals
};