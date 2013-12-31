var assert = function(expr, msg) {
	if (!expr) {
		throw Error(msg);
	}
}, log = console.log.bind(console),
	attachedTabs = {},
	telemetryTab = null,
	VERSION = '1.0',
	ports = {},
	backends = [];

chrome.runtime.onConnect.addListener(function(port) {
	if (!port.sender && !port.sender.tab) {
		return;
	}
	var tabId = port.sender.tab.id;
	log('Got connection from %s', tabId);
	ports[tabId] = port;
	port.onMessage.addListener(function(msg) {
		switch (msg.type) {
			case 'initTelemetry':
				log('Initializing telemetry on %s', tabId);
				attachDebugger(tabId);
				break;
			case 'telemetryResult':
				assert(telemetryTab === tabId, 'Got telemetry result from a different tab');
				onTelemetryResult(msg.data);
				break;
			case 'log':
				log.apply(this, [tabId].concat(msg.data));
				break;
			default:
				log('Cannot Handle message of type ' + msg.type);
		}
	});
	port.onDisconnect.addListener(function(event) {
		log('Connection closed with %s', tabId)
		delete ports[tabId];
	});
	if (tabId === telemetryTab) {
		// Usually done when this is a duplicate of some other tab
		attachDebugger(tabId);
	}
});

function sendMessage(tabId, type, data) {
	assert(typeof ports[tabId] !== 'undefined', 'No communication channel with ' + tabId + ', so cannot send message ' + type);
	ports[tabId].postMessage({
		type: type,
		data: data
	});
}

function attachDebugger(tabId) {
	assert(typeof attachedTabs[tabId] === 'undefined', 'Already debugging ' + tabId);
	chrome.debugger.attach({
		tabId: tabId
	}, VERSION, function() {
		if (chrome.runtime.lastError) {
			log('Error attaching on %s : %s', tabId, chrome.runtime.lastError.message);
			chrome.tabs.duplicate(tabId, function(newTab) {
				log('Duplicated Tab %s to %s', tabId, newTab.id);
				assert(telemetryTab === null, 'Looks like telemetry is already running on ' + telemetryTab);
				attachedTabs[tabId] = telemetryTab = newTab.id;
			});
		} else {
			log('Debugger attached to', tabId);
			attachedTabs[tabId] = true;
			backends.push(new TimelineBackend(tabId));
			backends.push(new TracingBackend(tabId));
			(function startBackends(i) {
				if (i < backends.length) {
					backends[i].start(function() {
						startBackends(i + 1);
					});
				} else {
					sendMessage(tabId, 'runTelemetry');
				}
			}(0));
		}
	});
}

function detachDebugger(data) {
	chrome.debugger.detach({
		tabId: telemetryTab
	}, function(result) {
		assert(!chrome.runtime.lastError, 'Could not detach debugger from ' + telemetryTab);
		for (var key in attachedTabs) {
			if (attachedTabs[key] === telemetryTab) {
				log('Relaying telemetry result to %s', key);
				sendMessage(key, 'telemetryResult', data);
				break;
			}
		}
		chrome.tabs.remove(telemetryTab);
		delete attachedTabs[telemetryTab];
		delete attachedTabs[key];
		telemetryTab = null;
	});
}

chrome.debugger.onDetach.addListener(function(source, reason) {
	log('Debugger detached on ', source.tabId);
	delete attachedTabs[source.tabId];
});

function onTelemetryResult(data) {
	log('Got Telemetry result from %s', telemetryTab);
	data._usedExtension = true;
	(function stopBackends(i) {
		if (i < backends.length) {
			backends[i].stop(function(result) {
				for (var key in result) {
					if (typeof data[key] !== 'undefined') {
						data['_' + key + '-old'] = data[key];
					}
					data[key] = result[key];
				}
				stopBackends(i + 1);
			});
		} else {
			detachDebugger(data);
		}
	}(0));
}