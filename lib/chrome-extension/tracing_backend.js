function TracingBackend(tabId) {
	this.data = [],
	this.isRunning = false;
	this.tabId = tabId;
	this.ev = {};
	this._startListening();
	this._results = null;
}

TracingBackend.prototype.start = function(cb) {
	assert(!this.isRunning, 'Cannot start tracing backend when it is already running');
	this.isRunning = true;
	chrome.debugger.sendCommand({
		tabId: this.tabId
	}, 'Tracing.start', {}, function(result) {
		assert(!chrome.runtime.lastError, 'Error starting tracing on %s' + this.tabId + chrome.runtime.lastError);
		log('Tracing backend started on ' + this.tabId, result);
		cb();
	}.bind(this));
}

TracingBackend.prototype.stop = function(cb) {
	assert(this.isRunning, 'Cannot start tracing backend when it is already running');
	this.isRunning = false;
	chrome.debugger.sendCommand({
		tabId: this.tabId
	}, 'Tracing.end', {}, function(result) {
		assert(!chrome.runtime.lastError, 'Error stopping tracing on ' + this.tabId + chrome.runtime.lastError);
		log('Tracing backend stopped on ' + this.tabId);
		var self = this;
		(function waitForResult() {
			if (self._results === null) {
				log('Waiting for trace complete');
				window.setTimeout(waitForResult, 1000);
			} else {
				cb(self._results);
			}
		}());
	}.bind(this));
}


TracingBackend.prototype._startListening = function() {
	chrome.debugger.onEvent.addListener(function(source, method, param) {
		switch (method) {
			case 'Tracing.dataCollected':
				this.data.push(param.value);
				break;
			case 'Tracing.tracingComplete':
				this._onTracingEnd(source.tabId, method, param);
				break;
			default:
				break;
		}
	}.bind(this));
}

TracingBackend.prototype._onTracingEnd = function() {
	log('Tracing Complete event for ' + this.tabId);
	var result = [];
	for (var i = 0; i < this.data.length; i++) {
		for (var j = 0; j < this.data[i].length; j++) {
			var val = this.data[i][j];
			// Interpreting frames using https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/
			if (val.name === 'ImplThreadRenderingStats::IssueTraceEvent' || val.name === 'MainThreadRenderingStats::IssueTraceEvent') {
				result.push(val);
			}
		}
	}
	log('Tracing Events added for analysis');
	this._results = {
		_tracingBackend: true,
	};
	var smoothness = new SmoothnessMetric(result);
	smoothness.addData(this._results);
}