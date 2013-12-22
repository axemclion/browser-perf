var attachedTabs = {}, VERSION = '1.0',
	telemetryTab = null,
	telemetryData = null;


chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	switch (message.type) {
		case 'start':
			attachDebugger(sender.tab, sendResponse);
			break;
		case 'log':
			console.log(sender.tab.id, message.data);
			sendResponse({});
			break;
		case 'telemetryResult':
			onTelemetryResult(sender.tab, message);
			sendResponse({});
			break;
		default:
			console.log('Could not interpret data', message);
			sendResponse({});
	}
});

function onTelemetryResult(tab, message) {
	console.log('Got Telemetry result from %s', tab.id);
	telemetryTab = null;
	telemetryData = message.data;
	chrome.debugger.sendCommand({
		tabId: tab.id
	}, 'Tracing.end', {}, function(result) {
		if (chrome.runtime.lastError) {
			console.log('Error ending tracing on %s', tab.id, chrome.runtime.lastError);
			return;
		}
	});
}

function onTracingEnd(tabId) {
	console.log('Tracing Complete event for %s', tabId);
	telemetryData.frame_data = getFrameData(data);
	var resultTab = tabId;
	for (var tab in attachedTabs) {
		if (tabId === attachedTabs[tab]) {
			resultTab = tab;
		}
	}
	chrome.debugger.detach({
		tabId: tabId
	}, function() {
		console.log('Debugger detached from %s', tabId);
		if (resultTab !== tabId) {
			console.log('Closing %s as it was a child of %s', tabId, resultTab);
			chrome.tabs.remove(tabId, function() {
				console.log('Closing %s', tabId);
			});
		}
		delete attachedTabs[tabId];
	});

	chrome.tabs.sendMessage(parseInt(resultTab), {
		type: 'telemetryResult',
		data: telemetryData
	});
}

function getFrameData(data) {
	var result = [];
	for (var i = 0; i < data.length; i++) {
		for (var j = 0; j < data[i].length; j++) {
			var val = data[i][j];
			// Interpreting frames using https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/
			if (val.name === 'ImplThreadRenderingStats::IssueTraceEvent' || val.name === 'MainThreadRenderingStats::IssueTraceEvent') {
				result.push(val);
			}
		}
	}
	return result;
}

function runTelemetry(tab) {
	if (telemetryTab !== null) {
		console.log('Running telemetry on %s, so cannot start on %s', telemetryTab, tab.id);
		return;
	}
	if (attachedTabs[tab.id] !== true) {
		console.log('No debugger is attached to %s, so cannot run telemetry', tab.id);
		return
	}
	chrome.debugger.sendCommand({
		tabId: tab.id
	}, 'Tracing.start', {}, function(result) {
		if (chrome.runtime.lastError) {
			console.log('Error starting tracing on %s', tab.id, chrome.runtime.lastError);
			return;
		}
		console.log('Tracing started on %s', tab.id, result);
		chrome.tabs.sendMessage(tab.id, {
			type: 'runTelemetry'
		});
	});
}

function attachDebugger(tab, sendResponse) {
	if (attachedTabs[tab.id] === true) {
		console.log('Debugger already attached on %s', tab.id);
		sendResponse({
			type: 'error',
			data: 'Debugger already attached to this tab'
		});
		return;
	}

	chrome.debugger.attach({
		tabId: tab.id
	}, VERSION, function() {
		if (chrome.runtime.lastError) {
			console.log(tab.id, chrome.runtime.lastError.message);
			chrome.tabs.duplicate(tab.id, function(newTab) {
				attachedTabs[tab.id] = newTab.id;
				sendResponse({
					type: 'error',
					data: 'attached', // TODO - check if this is indeed due to an attached debugger
				});
				console.log('Could not attach debugger to %s, so duplicated it to %s', tab.id, newTab.id);
			});
		} else {
			attachedTabs[tab.id] = true;
			sendResponse({
				type: 'attached'
			});
			console.log('Debugger attached to', tab.id);
			runTelemetry(tab);
		}
	});
}

var data = [];
var methods = {};
chrome.debugger.onEvent.addListener(function(source, method, param) {
	switch (method) {
		case 'Tracing.dataCollected':
			data.push(param.value);
			break;
		case 'Tracing.tracingComplete':
			onTracingEnd(source.tabId, method, param);
			break;
		default:
			break
	}
});

chrome.debugger.onDetach.addListener(function(source, reason) {
	console.log("Debugger detached on ", source.tabId);
	delete attachedTabs[source.tabId];
});