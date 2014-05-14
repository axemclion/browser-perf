var Q = require('q'),
	util = require('util'),
	events = require('events'),
	helpers = require('../helpers'),
	log = helpers.log(),
	spawn = require('child_process').spawn,
	byline = require('byline');

function AndroidTracingProbe(id) {
	if (id) {
		this.id = id;
	}
	log.debug('[AndroidTracingProbe]: Initialize');
	events.EventEmitter.call(this);
}

util.inherits(AndroidTracingProbe, events.EventEmitter);

AndroidTracingProbe.prototype.id = 'AndroidTracingProbe';

AndroidTracingProbe.prototype.isEnabled = function(browser) {
	return browser.platform.match(/android/i) && browser.browserName.match(/chrome/i) && parseInt(browser.version, 10) >= 33;
}

AndroidTracingProbe.prototype.setup = function(cfg) {
	var me = this;
	var enabled = false;
	cfg.browsers.forEach(function(browser) {
		enabled = enabled || browser.browserName.match(/android/i);
	});
	if (enabled) {
		log.debug('[AndroidTracingProbe]: Setting up android tracing');
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
		query = 'Logging performance trace to file: ';

	log.debug('[AndroidTracingProbe]: Starting android tracing');
	return this.run_('adb shell am broadcast -a com.android.chrome.GPU_PROFILER_START -e categories "benchmark" -e continuous ""').then(function() {
		return me.waitForLogCat_(query);
	}).then(function(line) {
		me.logFile = line.split(query)[1];
	});
};

AndroidTracingProbe.prototype.stopRecordingTrace_ = function(browser) {
	var me = this,
		query = 'Profiler finished. Results are in ' + me.logFile;

	log.debug('[AndroidTracingProbe]: Tearing down android tracing');

	return this.run_('adb shell am broadcast -a com.android.chrome.GPU_PROFILER_STOP').then(function() {
		return me.waitForLogCat_(query)
	}).then(function(line) {
		return me.pullLogs_(me.logFile);
	}).then(function(data) {
		me.emit('data', {
			type: 'chrome.tracing',
			value: data
		});
		log.debug('[AndroidTracingProbe]: Read all data');
	});
};

AndroidTracingProbe.prototype.run_ = function(commandString, timeout) {
	log.debug('[AndroidTracingProbe]: $ ' + commandString);
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

	return me.run_(['adb pull', me.logFile.replace('/storage/emulated/0/', '/sdcard/'), file].join(' ')).then(function() {
		var trace = require(file)
		require('fs').unlinkSync(file);
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