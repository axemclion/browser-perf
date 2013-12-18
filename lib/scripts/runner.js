window.__log__ = console.log.bind(console);
window.__telemetry__(saveData);

// For getting data from Chrome extensions
window.addEventListener('message', function(event) {
	saveData(event.data.data);
});

function saveData(data) {
	if (typeof window.__telemetryData__ !== 'undefined') {
		console.log('Telemetry data is already defined');
	} else {
		data.browser = window.navigator.userAgent;
		window.__telemetryData__ = data;
	}
}