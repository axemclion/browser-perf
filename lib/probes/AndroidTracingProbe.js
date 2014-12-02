var Q = require('q'),
	util = require('util'),
	debug = require('debug')('bp:probes:AndroidTracingProbe'),
	events = require('events'),
	helpers = require('../helpers'),
	spawn = require('child_process').spawn,
	byline = require('byline');

function AndroidTracingProbe(id) {
	if (id) {
		this.id = id;
	}
	debug('Initialize');
	events.EventEmitter.call(this);
}

util.inherits(AndroidTracingProbe, events.EventEmitter);

AndroidTracingProbe.prototype.id = 'AndroidTracingProbe';

AndroidTracingProbe.prototype.isEnabled = function(browser) {
	if (browser.platform && browser.platform.match(/android/i)) {
		if (browser.browserName && browser.browserName.match(/chrome/i) && parseInt(browser.version, 10) >= 33) {
			return true;
		}
	}

	if (browser.browserName && browser.browserName.match(/android/i)) {
		return true;
	}
	return false;
}

AndroidTracingProbe.prototype.setup = function(cfg) {
	var me = this;
	var enabled = false;
	this.debugBrowser = cfg.debugBrowser;
	cfg.browsers.forEach(function(browser) {
		enabled = me.isEnabled(browser);
	});
	if (enabled) {
		debug('Setting up android tracing');
		return this.run_('adb server start').fin(function() {
			return me.run_('adb logcat -c');
		});
	}
};

var lifeCycle = function(methodName) {
	return function(browser) {
		var me = this;
		return browser.sessionCapabilities().then(function(caps) {
			if (me.isEnabled(caps)) {
				return me[methodName](browser);
			}
		});
	};
}

AndroidTracingProbe.prototype.start = lifeCycle('startRecordingTrace_');
AndroidTracingProbe.prototype.teardown = lifeCycle('stopRecordingTrace_');

AndroidTracingProbe.prototype.startRecordingTrace_ = function(browser) {
	var me = this,
		query = 'Logging performance trace to file';

	debug('Starting android tracing');
	return this.run_('adb shell am broadcast -a com.android.chrome.GPU_PROFILER_START -e categories "benchmark" -e continuous ""').then(function() {
		return me.waitForLogCat_(query);
	}).then(function(line) {
		debug(line);
	});
};

AndroidTracingProbe.prototype.stopRecordingTrace_ = function(browser) {
	var me = this,
		query = 'Profiler finished. Results are in ';

	debug('Tearing down android tracing');

	return this.run_('adb shell am broadcast -a com.android.chrome.GPU_PROFILER_STOP').then(function() {
		return me.waitForLogCat_(query)
	}).then(function(line) {
		try {
			return me.pullLogs_(line.split(query)[1].slice(0, -1));
		} catch (e) {
			console.log(e);
			return Q();
		}
	}).then(function(data) {
		if (data) {
			me.emit('data', {
				type: 'chrome.tracing',
				value: data
			});
		}
		debug('Read all data');
	});
};

AndroidTracingProbe.prototype.run_ = function(commandString, timeout) {
	debug('$ ' + commandString);
	timeout = timeout || 1000 * 60 * 2;
	var deferred = Q.defer(),
		command = commandString.split(/\s/),
		done = false;
	var process = spawn(command[0], command.slice(1));
	var timerHandle = setTimeout(function() {
		if (!done) {
			done = true;
			process.kill();
			deferred.reject();
		}
	}, timeout);

	process.on('error', function() {});

	process.on('close', function(code, signal) {
		if (timerHandle) {
			clearTimeout(timerHandle);
		}
		if (!done) {
			done = true;
			deferred.resolve();
		}
	});

	return deferred.promise;
};

AndroidTracingProbe.prototype.waitForLogCat_ = function(query, timeout) {
	var deferred = Q.defer(),
		line = '',
		commandString = "adb logcat -s chromium:W TracingControllerAndroid:I",
		search = new RegExp(query, "i");

	timeout = timeout || 1000 * 60 * 2;
	var command = commandString.split(/\s/);
	var logcat = spawn(command[0], command.slice(1));
	stream = byline.createStream(logcat.stdout);

	var timerHandle = setTimeout(function() {
		done(false);
	}, timeout);

	stream.on('data', function(data) {
		var line = data.toString();
		//debug('> ', line);
		if (line.match(search)) {
			done(line);
		}
	});

	var completed = false;

	function done(arg) {
		if (timerHandle) {
			clearTimeout(timerHandle);
		}
		if (!completed) {
			completed = true;
			if (arg) {
				deferred.resolve(arg);
			} else {
				deferred.reject();
			}
		}
		logcat.kill();
	}

	return deferred.promise;
};

AndroidTracingProbe.prototype.pullLogs_ = function(filename) {
	var me = this,
		path = require('path'),
		file = path.join(__dirname, 'trace.json');

	return me.run_(['adb pull', filename.replace('/storage/emulated/0/', '/sdcard/'), file].join(' ')).then(function() {
		var trace = require(file)
		if (!me.debugBrowser) {
			require('fs').unlinkSync(file);
		}
		var events = [
			'ImplThreadRenderingStats::IssueTraceEvent',
			'MainThreadRenderingStats::IssueTraceEvent',
			'BenchmarkInstrumentation::ImplThreadRenderingStats',
			'BenchmarkInstrumentation::MainThreadRenderingStats'
		];
		return trace.traceEvents.filter(function(event) {
			for (var j = 0; j < events.length; j++) {
				if (event.name === events[j]) {
					return true;
				}
			}
			return false;
		});
	});
};

module.exports = AndroidTracingProbe;