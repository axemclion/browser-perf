function TimelineBackend(tabId) {
	this.isRunning = false;
	this.tabId = tabId;
	this.ev = {};
}

TimelineBackend.prototype.start = function(cb) {
	assert(!this.isRunning, 'Cannot start timeline backend when it is already running');
	this.isRunning = true;
	chrome.debugger.sendCommand({
		tabId: this.tabId
	}, 'Timeline.start', {
		'bufferEvents': true
	}, function(result) {
		assert(!chrome.runtime.lastError, 'Error starting timeline on %s' + this.tabId + chrome.runtime.lastError);
		log('Timline backend started on ' + this.tabId, result);
		cb();
	}.bind(this));
}

TimelineBackend.prototype.stop = function(cb) {
	assert(this.isRunning, 'Cannot start timeline backend when it is already running');
	this.isRunning = false;
	chrome.debugger.sendCommand({
		tabId: this.tabId
	}, 'Timeline.stop', {}, function(result) {
		assert(!chrome.runtime.lastError, 'Error stopping timeline on ' + this.tabId + chrome.runtime.lastError);
		log('Timline backend stopped on ' + this.tabId);
		this.processEvents(result.events);
		var res = {
			_timelineBackend: true
		}
		for (var key in this.ev) {
			if (this.ev[key].length > 0) {
				res[key] = statistics.Total(this.ev[key]);
				res[key + '_avg'] = statistics.ArithmeticMean(this.ev[key], this.ev[key].length);
				res[key + '_max'] = Math.max.apply(Math, this.ev[key]);
			}
		}
		cb(res);
	}.bind(this));
}

TimelineBackend.prototype.processEvents = function(result) {
	if (typeof result === 'undefined') {
		return;
	}
	for (var i = 0; i < result.length; i++) {
		var event = result[i];
		if (typeof this.ev[event.type] === 'undefined') {
			this.ev[event.type] = [];
		}
		if (event.endTime && event.startTime) {
			this.ev[event.type].push(event.endTime - event.startTime);
		}
		this.processEvents(event.children);
	}
}