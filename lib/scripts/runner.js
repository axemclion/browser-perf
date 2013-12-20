window.__log__ = console.log.bind(console);

// For getting data from Chrome extensions
window.addEventListener('message', function(event) {
	if (event.source == window && event.data.type === 'telemetryResult') {
		__log__('Got telemetry from extension');
		saveData(event.data.data);
	}
});

window.setTimeout(function() {
	if (isExtensionActive()) {
		__log__('Webpage ready - asking extension for telemetryData');
		window.postMessage({
			type: 'readyForTelemetryData'
		}, '*');
	} else {
		__log__('No extension found on page');
		window.__telemetry__(saveData);
	}
}, 0);


function isExtensionActive() {
	return window.document.body.getAttribute('browser-perf-extension');
}

function saveData(data) {
	if (typeof window.__telemetryData__ !== 'undefined') {
		__log__('Telemetry data is already defined');
	} else {
		__log__('Saving Telemetry data');
		window.__telemetryData__ = data;
		window.__telemetryData__.browser = window.navigator.userAgent;
	}
}