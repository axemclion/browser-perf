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
		window.postMessage({
			type: 'telemetryResult',
			data: message.data
		}, '*');
		__log__('Got Telemetry Result', message.data);
	}
});

window.__log__ = function() {
	console.log.apply(console, arguments);
	chrome.runtime.sendMessage({
		type: 'log',
		data: arguments
	}, function(response) {});
};