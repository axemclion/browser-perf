window.__log__ = function() {
	console.log.apply(console, arguments);
};

window.__telemetry__(function(data) {
	data.browser = window.navigator.userAgent;
	window.__telemetryData__ = data;
});