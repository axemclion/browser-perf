# browser-perf

- Is a NodeJS based tool
- For measuring browser performance metrics (like layout, paint, dom load or frame times) 
- For Web pages, Cordova/Phonegap and other Hybrid applications. 
- Metrics are measured when scrolling the web page, or during a Checkout workflow defined using Selenium.  
- Tool collects the metrics from sources like `about:tracing`, Chrome Devtools timeline, IE UI Responsiveness tab, Xperf, etc. 
- Monitor this information regularly by integrating the tool with continuous integration systems. 

Please see the [wiki pages](https://github.com/axemclion/browser-perf/wiki/_pages) for more information. 

## Usage

### Command line

Install the tool using `npm install -g browser-perf` and then run 

```
$ browser-perf http://yourwebsite.com --browsers=chrome,firefox --selenium=ondemand.saucelabs.com --username=username --accesskey=accesskey
```

- Replace username and access key with the [saucelabs.com](http://saucelabs.com) username and accesskey
- If you have [Selenium](http://www.seleniumhq.org/download/) set up, you could substitute `ondemand.saucelabs.com` with `localhost:4444`
- You can also use [BrowserStack](http://browserstack.com) credentials and substitute `ondemand.saucelabs.com` with `hub.browserstack.com`

See the [wiki page](https://github.com/axemclion/browser-perf/wiki/Command-Line-Usage) for an extensive list of command line options and more usage scenarios.

## Node Module

browser-perf is also a node module and has the following API

```javascript

var browserPerf = require('browser-perf');
browserPerf('/*URL of the page to be tested*/', function(err, res) {
	// res - array of objects. Metrics for this URL
	res === {
		browserName : "chrome"
	};
}, {
	selenium: 'localhost:4444',
	browsers: ['chrome', 'firefox']
	username: SAUCE_USERNAME // if running tests on the cloud  
});

```
See the [API wiki page](https://github.com/axemclion/browser-perf/wiki/Node-Module---API) for more details on configuring. 
Instructions on using it for Cordova apps is also on the [wiki](https://github.com/axemclion/browser-perf/wiki/Setup#wiki-cordova-applications)

## Scenario
- Websites can become slow
  - over time as more CSS and Javascript is added
  - due to a single commit that adds expensive CSS (like gradients) 
- We use tools in [Chrome](https://developers.google.com/chrome-developer-tools/docs/timeline) or [Internet Explorer](http://msdn.microsoft.com/en-us/library/ie/dn255009%28v=vs.85%29.asp) only when the site is too slow. 
- Tools like YSlow and Page Speed are great, but will it not be better if the are a part of continuous integration?
- Tools like this(http://npmjs.org/package/browser-perf) and [Phantomas](https://github.com/macbre/phantomas) can fill the gap to monitor site performance every time a checkin is performed. 

## License
Licensed under BSD-2 Clause. See License.txt for more details 

## Contact
Please ping [me](http://twitter.com/nparashuram) if you would need help setting this up. 