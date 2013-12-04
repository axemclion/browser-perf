window.__log__ = function() {
	console.log.apply(console, arguments);
};

window.__telemetry__(function(data) {
	window.__telemetryData__ = data;
});