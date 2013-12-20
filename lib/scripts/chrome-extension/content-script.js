// Scroll runs on document.body, so if that does not 
window.document.body.setAttribute('browser-perf-extension', true);

window.__log__ = function() {
	console.log.apply(console, arguments);
	chrome.runtime.sendMessage({
		type: 'log',
		data: arguments
	}, function(response) {});
};

chrome.runtime.sendMessage({
	type: 'start'
}, function(response) {
	switch (response.type) {
		case 'attaced':
			__log__('Debugger attached');
			break;
		case 'error':
			__log__('Could not attach debugger', response.data);
		default:
			__log__(response);
	}
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	if (message.type === 'runTelemetry') {
		__log__('Starting Telemetry');
		window.__telemetry__(function(data) {
			__log__('Finished running Telemetry', data);
			chrome.runtime.sendMessage({
				type: 'telemetryResult',
				data: data
			});
		});
	} else if (message.type === 'telemetryResult') {
		message.data.usedExtension = true;
		window.__telemetryData__ = message.data;
		window.postMessage({
			type: 'telemetryResult',
			data: window.__telemetryData__
		}, '*');
		__log__('Got telemetry data from backgroun script:', message.data);
	}
});

window.addEventListener('message', function(event) {
	// The webpage signalling that it is ready to accept telemetryData
	if (event.source != window || event.data.type !== 'readyForTelemetryData') {
		return;
	}
	if (window.__telemetryData__) {
		window.postMessage({
			type: 'telemetryResult',
			data: window.__telemetryData__
		}, '*');
	} else {
		__log__('No telemetry data yet, so wait for telemetryResult from background script');
	}
});