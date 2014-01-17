// Indicate to the page that the extension is installed
if (parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10) >= 31) {
	// Scroll runs on document.body, so if that does not exist, bad this will happen anyway
	window.document.body.setAttribute('browser-perf-extension', true);
}

var log = window.__log__ = function() {
	console.log.apply(console, arguments);
	sendMessage('log', Array.prototype.slice.call(arguments, 0));
};

// Start the whole thing when we first get a message from the page 
// to run telemetry
window.addEventListener('message', function(event) {
	if (event.source == window && event.data.type === 'initTelemetry') {
		log('Got message from page to start telemetry, so telling background to get ready');
		sendMessage('initTelemetry');
	}
});

// Message passing to the background script
var port = chrome.runtime.connect({});
var sendMessage = function(type, data) {
	port.postMessage({
		type: type,
		data: data
	});
};
port.onMessage.addListener(function(msg) {
	switch (msg.type) {
		case 'runTelemetry':
			log("Background is ready, starting telemetry now");
			window.__telemetry__(function(data) {
				log("Sending it to background script so that it is relayed to the tab");
				// Adding a delay so that all scrolling completes before starting the heavy calcs
				window.setTimeout(function() {
					sendMessage('telemetryResult', data);
				}, 2000);
			});
			break;
		case 'telemetryResult':
			log("Background sent telemetry result", msg.data);
			window.postMessage({
				type: 'telemetryResult',
				data: msg.data
			}, '*');
			break;
		default:
			log('Cannot handle message' + msg.type);
	}
});