# browser-perf

A tool for measuring browser rendering performance metrics like first paint time, dom loaded time, mean frame time when scrolling, etc. 
It uses Chromium Telemetry smoothness and loading benchmarks to calculate how smooth and jankfree a page is. 

# Usage

## Command line

1. Download and install [Selenium Server (formerly the Selenium RC Server)](http://www.seleniumhq.org/download/) and the appropriate browser drivers ([chrome](http://chromedriver.storage.googleapis.com/index.html))
2. Alternatively, [BrowserStack](http://browserstack.com/) or [Saucelabs](http://saucelabs.com/) can also be used. 
3. Install browser-perf using `npm install -g browser-perf`
3. Run `browser-perf --help` to see the various command line options
4. To test a particular page, run `browser-perf --browsers=chrome,firefox --selenium=ondemand.saucelabs.com:80`
5. It can also be run with a configuration file speficied. Look into the ./test/res/*.config.json for the configuration files. 

## Node Module

browser-perf is also a node module and has the following API

```javascript

var browserPerf = require('browser-perf');
browserPerf('/*URL of the page to be tested*/', function(err, res) {
	// res - array of objects. Metrics for this URL
	res === {
		browserName : "chrome",
		userAgent : "",
	};
}, {
	/* See ./test/res/*.config.json files for more ways to configure this */
	selenium: 'localhost:4444',
	browsers: ['chrome', 'firefox']
	logger: log // can be bunyan or grunt logger
});
```