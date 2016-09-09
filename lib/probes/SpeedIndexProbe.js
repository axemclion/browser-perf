var Q = require('q'),
  util = require('util'),
  wd = require('wd'),
  events = require('events'),
  helpers = require('../helpers');

function SpeedIndexProbe() {
  events.EventEmitter.call(this);
}

util.inherits(SpeedIndexProbe, events.EventEmitter);

SpeedIndexProbe.prototype.id = 'SpeedIndexProbe';

SpeedIndexProbe.prototype.teardown = function(browser) {
  var code = function() {
    var requestAnimationFrame = (function() {
      return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback) {
          window.setTimeout(callback, 1000 / 60);
        };
    })().bind(window);
    requestAnimationFrame(function() {
      /**
       * RUM Speed Index Calculation
       * @source https://github.com/WPO-Foundation/RUM-SpeedIndex/blob/master/src/rum-speedindex.js
       */
      /******************************************************************************
       Copyright (c) 2014, Google Inc.
       All rights reserved.

       Redistribution and use in source and binary forms, with or without
       modification, are permitted provided that the following conditions are met:

       * Redistributions of source code must retain the above copyright notice,
       this list of conditions and the following disclaimer.
       * Redistributions in binary form must reproduce the above copyright notice,
       this list of conditions and the following disclaimer in the documentation
       and/or other materials provided with the distribution.
       * Neither the name of the <ORGANIZATION> nor the names of its contributors
       may be used to endorse or promote products derived from this software
       without specific prior written permission.

       THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
       AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
       IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
       DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
       FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
       DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
       SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
       CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
       OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
       OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
       ******************************************************************************/

      /******************************************************************************
       *******************************************************************************
       Calculates the Speed Index for a page by:
       - Collecting a list of visible rectangles for elements that loaded
       external resources (images, background images, fonts)
       - Gets the time when the external resource for those elements loaded
       through Resource Timing
       - Calculates the likely time that the background painted
       - Runs the various paint rectangles through the SpeedIndex calculation:
       https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index

       TODO:
       - Improve the start render estimate
       - Handle overlapping rects (though maybe counting the area as multiple paints
       will work out well)
       - Detect elements with Custom fonts and the time that the respective font
       loaded
       - Better error handling for browsers that don't support resource timing
       *******************************************************************************
       ******************************************************************************/

      var RUMSpeedIndex = function(win) {
        win = win || window;
        var doc = win.document;

        /****************************************************************************
         Support Routines
         ****************************************************************************/
        // Get the rect for the visible portion of the provided DOM element
        var GetElementViewportRect = function(el) {
          var intersect = false;
          if (el.getBoundingClientRect) {
            var elRect = el.getBoundingClientRect();
            intersect = {'top': Math.max(elRect.top, 0),
              'left': Math.max(elRect.left, 0),
              'bottom': Math.min(elRect.bottom, (win.innerHeight || doc.documentElement.clientHeight)),
              'right': Math.min(elRect.right, (win.innerWidth || doc.documentElement.clientWidth))};
            if (intersect.bottom <= intersect.top ||
              intersect.right <= intersect.left) {
              intersect = false;
            } else {
              intersect.area = (intersect.bottom - intersect.top) * (intersect.right - intersect.left);
            }
          }
          return intersect;
        };

        // Check a given element to see if it is visible
        var CheckElement = function(el, url) {
          if (url) {
            var rect = GetElementViewportRect(el);
            if (rect) {
              rects.push({'url': url,
                'area': rect.area,
                'rect': rect});
            }
          }
        };

        // Get the visible rectangles for elements that we care about
        var GetRects = function() {
          // Walk all of the elements in the DOM (try to only do this once)
          var elements = doc.getElementsByTagName('*');
          var re = /url\(.*(http.*)\)/ig;
          for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            var style = win.getComputedStyle(el);

            // check for Images
            if (el.tagName == 'IMG') {
              CheckElement(el, el.src);
            }
            // Check for background images
            if (style['background-image']) {
              re.lastIndex = 0;
              var matches = re.exec(style['background-image']);
              if (matches && matches.length > 1)
                CheckElement(el, matches[1].replace('"', ''));
            }
            // recursively walk any iFrames
            if (el.tagName == 'IFRAME') {
              try {
                var rect = GetElementViewportRect(el);
                if (rect) {
                  var tm = RUMSpeedIndex(el.contentWindow);
                  if (tm) {
                    rects.push({'tm': tm,
                      'area': rect.area,
                      'rect': rect});
                  }
                }
              } catch(e) {
              }
            }
          }
        };

        // Get the time at which each external resource loaded
        var GetRectTimings = function() {
          var timings = {};
          var requests = win.performance.getEntriesByType("resource");
          for (var i = 0; i < requests.length; i++)
            timings[requests[i].name] = requests[i].responseEnd;
          for (var j = 0; j < rects.length; j++) {
            if (!('tm' in rects[j]))
              rects[j].tm = timings[rects[j].url] !== undefined ? timings[rects[j].url] : 0;
          }
        };

        // Get the first paint time.
        var GetFirstPaint = function() {
          // If the browser supports a first paint event, just use what the browser reports
          if ('msFirstPaint' in win.performance.timing)
            firstPaint = win.performance.timing.msFirstPaint - navStart;
          if ('chrome' in win && 'loadTimes' in win.chrome) {
            var chromeTimes = win.chrome.loadTimes();
            if ('firstPaintTime' in chromeTimes && chromeTimes.firstPaintTime > 0) {
              var startTime = chromeTimes.startLoadTime;
              if ('requestTime' in chromeTimes)
                startTime = chromeTimes.requestTime;
              if (chromeTimes.firstPaintTime >= startTime)
                firstPaint = (chromeTimes.firstPaintTime - startTime) * 1000.0;
            }
          }
          // For browsers that don't support first-paint or where we get insane values,
          // use the time of the last non-async script or css from the head.
          if (firstPaint === undefined || firstPaint < 0 || firstPaint > 120000) {
            firstPaint = win.performance.timing.responseStart - navStart;
            var headURLs = {};
            var headElements = doc.getElementsByTagName('head')[0].children;
            for (var i = 0; i < headElements.length; i++) {
              var el = headElements[i];
              if (el.tagName == 'SCRIPT' && el.src && !el.async)
                headURLs[el.src] = true;
              if (el.tagName == 'LINK' && el.rel == 'stylesheet' && el.href)
                headURLs[el.href] = true;
            }
            var requests = win.performance.getEntriesByType("resource");
            var doneCritical = false;
            for (var j = 0; j < requests.length; j++) {
              if (!doneCritical &&
                headURLs[requests[j].name] &&
                (requests[j].initiatorType == 'script' || requests[j].initiatorType == 'link')) {
                var requestEnd = requests[j].responseEnd;
                if (firstPaint === undefined || requestEnd > firstPaint)
                  firstPaint = requestEnd;
              } else {
                doneCritical = true;
              }
            }
          }
          firstPaint = Math.max(firstPaint, 0);
        };

        // Sort and group all of the paint rects by time and use them to
        // calculate the visual progress
        var CalculateVisualProgress = function() {
          var paints = {'0':0};
          var total = 0;
          for (var i = 0; i < rects.length; i++) {
            var tm = firstPaint;
            if ('tm' in rects[i] && rects[i].tm > firstPaint)
              tm = rects[i].tm;
            if (paints[tm] === undefined)
              paints[tm] = 0;
            paints[tm] += rects[i].area;
            total += rects[i].area;
          }
          // Add a paint area for the page background (count 10% of the pixels not
          // covered by existing paint rects.
          var pixels = Math.max(doc.documentElement.clientWidth, win.innerWidth || 0) *
            Math.max(doc.documentElement.clientHeight, win.innerHeight || 0);
          if (pixels > 0 ) {
            pixels = Math.max(pixels - total, 0) * pageBackgroundWeight;
            if (paints[firstPaint] === undefined)
              paints[firstPaint] = 0;
            paints[firstPaint] += pixels;
            total += pixels;
          }
          // Calculate the visual progress
          if (total) {
            for (var time in paints) {
              if (paints.hasOwnProperty(time)) {
                progress.push({'tm': time, 'area': paints[time]});
              }
            }
            progress.sort(function(a,b){return a.tm - b.tm;});
            var accumulated = 0;
            for (var j = 0; j < progress.length; j++) {
              accumulated += progress[j].area;
              progress[j].progress = accumulated / total;
            }
          }
        };

        // Given the visual progress information, Calculate the speed index.
        var CalculateSpeedIndex = function() {
          if (progress.length) {
            SpeedIndex = 0;
            var lastTime = 0;
            var lastProgress = 0;
            for (var i = 0; i < progress.length; i++) {
              var elapsed = progress[i].tm - lastTime;
              if (elapsed > 0 && lastProgress < 1)
                SpeedIndex += (1 - lastProgress) * elapsed;
              lastTime = progress[i].tm;
              lastProgress = progress[i].progress;
            }
          } else {
            SpeedIndex = firstPaint;
          }
        };

        /****************************************************************************
         Main flow
         ****************************************************************************/
        var rects = [];
        var progress = [];
        var firstPaint;
        var SpeedIndex;
        var pageBackgroundWeight = 0.1;
        try {
          var navStart = win.performance.timing.navigationStart;
          GetRects();
          GetRectTimings();
          GetFirstPaint();
          CalculateVisualProgress();
          CalculateSpeedIndex();
        } catch(e) {
        }
        /* Debug output for testing
         var dbg = '';
         dbg += "Paint Rects\n";
         for (var i = 0; i < rects.length; i++)
         dbg += '(' + rects[i].area + ') ' + rects[i].tm + ' - ' + rects[i].url + "\n";
         dbg += "Visual Progress\n";
         for (var i = 0; i < progress.length; i++)
         dbg += '(' + progress[i].area + ') ' + progress[i].tm + ' - ' + progress[i].progress + "\n";
         dbg += 'First Paint: ' + firstPaint + "\n";
         dbg += 'Speed Index: ' + SpeedIndex + "\n";
         console.log(dbg);
         */
        return SpeedIndex;
      };
      var speedIndex = RUMSpeedIndex(window);
      window.__speedIndex = {
        speedIndex: speedIndex
      };
    });
  }

  var me = this;
  return browser.execute(helpers.fnCall(code)).then(function() {
    return browser.waitFor({
      asserter: wd.asserters.jsCondition('(typeof window.__speedIndex !== "undefined")', false),
      timeout: 1000 * 60 * 10,
      pollFreq: 1000
    });
  }).then(function(res) {
    return browser.eval('window.__speedIndex');
  }).then(function(res) {
    me.emit('data', res);
  });
};

module.exports = SpeedIndexProbe;