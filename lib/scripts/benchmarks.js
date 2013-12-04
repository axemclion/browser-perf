/**
 * Script inserted into the page to collect various benchmarks
 */

'use strict';
(function(window, undefined) {

	var results = {};
	var mozFirstPaintTime = null;

	function mozPaintHandler() {
		window.removeEventListener('MozAfterPaint', mozPaintHandler);
		mozFirstPaintTime = new Date().getTime();
	}
	window.addEventListener('MozAfterPaint', mozPaintHandler, true);

	function getStats(cb) {
		// Smoothness Benchmarks
		var stats = window.__RenderingStats();

		stats.start();
		__log__('Starting scrolling action');
		var action = new __ScrollAction(function() {
			__log__('Scrolling action completed');
			// Load Timing from page
			var load_timings = window.performance.timing;
			results['load_time_ms'] = load_timings['loadEventStart'] - load_timings['navigationStart'];
			results['dom_content_loaded_time_ms'] = load_timings['domContentLoadedEventStart'] - load_timings['navigationStart'];

			stats.stop();
			var rendering_stats_deltas = stats.getDeltas();
			calcScrollResults(rendering_stats_deltas, results);
			calcTextureUploadResults(rendering_stats_deltas, results);
			calcImageDecodingResults(rendering_stats_deltas, results);
			calcFirstPaintTimeResults(results, function() {
				cb(results);
			});
		});

		document.body.scrollTop = 1;
		action.start(document.body.scrollTop === 1 ? document.body : document.documentElement)
	}

	function calcFirstPaintTimeResults(results, cb) {
		results['first_paint'] = null;
		if (typeof window.chrome !== 'undefined') {
			window.webkitRequestAnimationFrame(function() {
				var first_paint_secs = window.chrome.loadTimes().firstPaintTime - window.chrome.loadTimes().startLoadTime;
				results['first_paint'] = first_paint_secs * 1000;
				cb();
			});
		} else if (typeof window.performance.timing.msFirstPaint !== 'undefined') {
			window.setTimeout(function() {
				results['first_paint'] = window.performance.timing.msFirstPaint - window.performance.timing.navigationStart;
				cb();
			}, 1000);
		} else if (mozFirstPaintTime !== null) {
			results['first_paint'] = mozFirstPaintTime - window.performance.timing.navigationStart;
			cb();
		} else {
			__log__('Did not recognize browser to calculated');
			cb();
		}
	}

	function calcScrollResults(rendering_stats_deltas, results) {
		var num_frames_sent_to_screen = rendering_stats_deltas['numFramesSentToScreen'];
		var mean_frame_time_seconds = rendering_stats_deltas['totalTimeInSeconds'] / num_frames_sent_to_screen;
		var dropped_percent = rendering_stats_deltas['droppedFrameCount'] / num_frames_sent_to_screen;
		var num_impl_thread_scrolls = rendering_stats_deltas['numImplThreadScrolls'] || 0;
		var num_main_thread_scrolls = rendering_stats_deltas['numMainThreadScrolls'] || 0;
		var percent_impl_scrolled = (num_impl_thread_scrolls + num_main_thread_scrolls) === 0 ? 0 : num_impl_thread_scrolls / (num_impl_thread_scrolls + num_main_thread_scrolls);
		var num_layers = (rendering_stats_deltas['numLayersDrawn'] || 0) / num_frames_sent_to_screen;
		var num_missing_tiles = (rendering_stats_deltas['numMissingTiles'] || 0) / num_frames_sent_to_screen;

		results['mean_frame_time'] = mean_frame_time_seconds * 1000
		results['dropped_percent'] = dropped_percent * 100;
		results['percent_impl_scrolled'] = percent_impl_scrolled * 100;
		results['average_num_layers_drawn'] = num_layers;
		results['average_num_missing_tiles'] = num_missing_tiles;
	}

	function calcTextureUploadResults(rendering_stats_deltas, results) {
		var averageCommitTimeMs = 0;
		if (typeof rendering_stats_deltas['totalCommitCount'] !== 'undefined' && rendering_stats_deltas['totalCommitCount'] !== 0)
			averageCommitTimeMs = 1000 * rendering_stats_deltas['totalCommitTimeInSeconds'] / rendering_stats_deltas['totalCommitCount']

		results['texture_upload_count'] = rendering_stats_deltas['textureUploadCount'] || 0;
		results['total_texture_upload_time'] = rendering_stats_deltas['totalTextureUploadTimeInSeconds'] || 0;
		results['average_commit_time'] = averageCommitTimeMs;
	}

	function calcImageDecodingResults(rendering_stats_deltas, results) {
		var totalDeferredImageDecodeCount = rendering_stats_deltas['totalDeferredImageDecodeCount'] || 0;
		var totalDeferredImageCacheHitCount = rendering_stats_deltas['totalDeferredImageCacheHitCount'] || 0;
		var totalImageGatheringCount = rendering_stats_deltas['totalImageGatheringCount'] || 0;
		var totalDeferredImageDecodeTimeInSeconds = rendering_stats_deltas['totalDeferredImageDecodeTimeInSeconds'] || 0;
		var totalImageGatheringTimeInSeconds = rendering_stats_deltas['totalImageGatheringTimeInSeconds'] || 0;
		var averageImageGatheringTime = totalImageGatheringCount === 0 ? 0 : totalImageGatheringTimeInSeconds * 1000 / totalImageGatheringCount;

		results['total_deferred_image_decode_count'] = totalDeferredImageDecodeCount;
		results['total_image_cache_hit_count'] = totalDeferredImageCacheHitCount;
		results['average_image_gathering_time'] = averageImageGatheringTime;
		results['total_deferred_image_decoding_time'] = totalDeferredImageDecodeTimeInSeconds;
	}


	window.__telemetry__ = getStats;

}(window));