// Similar to [chromium_src]/src/tools/perf/metrics/statistics.py

module.exports = (function() {

	function sorted(array) {
		return array.sort();
	}

	function len(array) {
		return array.length;
	}

	var bisect = {
		bisect_left: function() {

		},
		bisect_right: function() {

		}
	};

	var d3_bisector = (function(f) {
		return {
			left: function(a, x, lo, hi) {
				if (arguments.length < 3) lo = 0;
				if (arguments.length < 4) hi = a.length;
				while (lo < hi) {
					var mid = lo + hi >>> 1;
					if (f.call(a, a[mid], mid) < x) lo = mid + 1;
					else hi = mid;
				}
				return lo;
			},
			right: function(a, x, lo, hi) {
				if (arguments.length < 3) lo = 0;
				if (arguments.length < 4) hi = a.length;
				while (lo < hi) {
					var mid = lo + hi >>> 1;
					if (x < f.call(a, a[mid], mid)) hi = mid;
					else lo = mid + 1;
				}
				return lo;
			}
		};
	}(function(d) {
		return d;
	}));

	var bisect = {
		bisect_left: d3_bisector.left,
		bisect_right: d3_bisector.right,
	};

	/*
# Copyright 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
*/

	//A collection of statistical utility functions to be used by metrics.

	function Clamp(value, low, high) {
		low = low || 0;
		high = high || 1.0;
		// """Clamp a value between some low and high value."""
		return Math.min(Math.max(value, low), high);
	}

	function NormalizeSamples(samples) {
		//Sorts the samples, and map them linearly to the range [0,1].
		//They're mapped such that for the N samples, the first sample is 0.5/N and the
		//last sample is (N-0.5)/N.
		//Background: The discrepancy of the sample set i/(N-1); i=0, ..., N-1 is 2/N,
		//twice the discrepancy of the sample set (i+1/2)/N; i=0, ..., N-1. In our case
		//we don't want to distinguish between these two cases, as our original domain
		//is not bounded (it is for Monte Carlo integration, where discrepancy was
		//first used).
		if (!samples)
			return [samples, 1.0];
		samples = sorted(samples);
		var low = samples[0];
		var high = samples[samples.length - 1];
		var new_low = 0.5 / len(samples)
		var new_high = (len(samples) - 0.5) / len(samples);
		if (high - low == 0.0)
			return [samples, 1.0];
		var scale = (new_high - new_low) / (high - low);
		for (var i = 0; i < len(samples); i++) {
			samples[i] = (samples[i] - low) * scale + new_low
		}
		return [samples, scale];
	}

	function Discrepancy(samples, interval_multiplier) {
		interval_multiplier = interval_multiplier || 10000;

		// "Computes the discrepancy of a set of 1D samples from the interval [0,1].

		// The samples must be sorted.

		// http://en.wikipedia.org/wiki/Low-discrepancy_sequence
		// http://mathworld.wolfram.com/Discrepancy.html

		if (!samples) return 1.0;

		var max_local_discrepancy = 0;
		var locations = [];
		// # For each location, stores the number of samples less than that location.
		var left = [];
		// # For each location, stores the number of samples less than or equal to that
		// # location.
		var right = [];

		var interval_count = len(samples) * interval_multiplier;
		// # Compute number of locations the will roughly result in the requested number of intervals.
		var location_count = Math.ceil(Math.sqrt(interval_count * 2));
		var inv_sample_count = 1.0 / len(samples);

		// # Generate list of equally spaced locations.
		for (var i = 0; i < location_count; i++) {
			var location = (i) / (location_count - 1);
			locations.push(location);
			left.push(bisect.bisect_left(samples, location));
			right.push(bisect.bisect_right(samples, location));
		}
		//# Iterate over the intervals defined by any pair of locations.
		for (var i = 0; i < len(locations); i++) {
			for (var j = 0; j < len(locations); j++) {
				//# Compute length of interval and number of samples in the interval.
				var length = locations[j] - locations[i]
				var count = right[j] - left[i]

				//# Compute local discrepancy and update max_local_discrepancy.
				local_discrepancy = Math.abs(count * inv_sample_count - length);
				max_local_discrepancy = Math.max(local_discrepancy, max_local_discrepancy)
			}
		}

		return max_local_discrepancy;
	}


	function FrameDiscrepancy(frame_timestamps, absolute, interval_multiplier) {
		absolute = absolute || true;
		interval_multiplier = interval_multiplier || 10000;
		// """A discrepancy based metric for measuring jank.

		// 	FrameDiscrepancy quantifies the largest area of jank observed in a series
		// 	of timestamps.  Note that this is different form metrics based on the
		// 	max_frame_time. For example, the time stamp series A = [0,1,2,3,5,6] and
		// 	B = [0,1,2,3,5,7] have the same max_frame_time = 2, but
		// 	Discrepancy(B) > Discrepancy(A).

		// 	Two variants of discrepancy can be computed:

		// 	Relative discrepancy is following the original definition of
		// 	discrepancy. It characterized the largest area of jank, relative to the
		// 	duration of the entire time stamp series.  We normalize the raw results,
		// 	because the best case discrepancy for a set of N samples is 1/N (for
		// 	equally spaced samples), and we want our metric to report 0.0 in that
		// 	case.

		// 	Absolute discrepancy also characterizes the largest area of jank, but its
		// 	value wouldn't change (except for imprecisions due to a low
		// 	interval_multiplier) if additional 'good' frames were added to an
		// 	exisiting list of time stamps.  Its range is [0,inf] and the unit is
		// 	milliseconds.

		// 	The time stamp series C = [0,2,3,4] and D = [0,2,3,4,5] have the same
		// 	absolute discrepancy, but D has lower relative discrepancy than C.
		// 	"""
		if (!frame_timestamps)
			return 1.0;
		var n = NormalizeSamples(frame_timestamps);
		var samples = n[0];
		var sample_scale = n[1];
		var discrepancy = Discrepancy(samples, interval_multiplier);
		var inv_sample_count = 1.0 / len(samples)
		if (absolute)
		//# Compute absolute discrepancy
			discrepancy /= sample_scale;
		else
		//# Compute relative discrepancy
			discrepancy = Clamp((discrepancy - inv_sample_count) / (1.0 - inv_sample_count))
		return discrepancy;
	}

	function ArithmeticMean(numerator, denominator) {

		// """Calculates arithmetic mean.

		// Both numerator and denominator can be given as either individual
		// values or lists of values which will be summed.

		// Args:
		// numerator: A quantity that represents a sum total value.
		// denominator: A quantity that represents a count of the number of things.

		// Returns:
		// The arithmetic mean value, or 0 if the denominator value was 0.
		// """

		var numerator_total = Total(numerator);
		var denominator_total = Total(denominator);
		return DivideIfPossibleOrZero(numerator_total, denominator_total);
	}

	function Total(data) {
		/*"""Returns the float value of a number or the sum of a list."""*/
		if (typeof data == "number")
			total = data;
		else if (typeof data.length !== 'undefined' && data.length === 0)
			total = 0;
		else
			total = data.reduce(function(prev, cur) {
				return prev + cur
			});
		return total;
	}

	function DivideIfPossibleOrZero(numerator, denominator) {
		//"""Returns the quotient, or zero if the denominator is zero."""
		if (!denominator)
			return 0.0
		else
			return numerator / denominator;
	}

	/*
def GeneralizedMean(values, exponent):
"""See http://en.wikipedia.org/wiki/Generalized_mean"""
if not values:
return 0.0
sum_of_powers = 0.0
for v in values:
sum_of_powers += v ** exponent
return (sum_of_powers / len(values)) ** (1.0/exponent)
*/

	function Median(values) {
		/*""
"Gets the median of a list of values."
""*/
		return Percentile(values, 50);
	}


	function Percentile(values, percentile) {
		percentile = percentile || 0;

		// """Calculates the value below which a given percentage of values fall.

		// For example, if 17% of the values are less than 5.0, then 5.0 is the 17th
		// percentile for this set of values. When the percentage doesn't exactly
		// match a rank in the list of values, the percentile is computed using linear
		// interpolation between closest ranks.

		// Args:
		// values: A list of numerical values.
		// percentile: A number between 0 and 100.

		// Returns:
		// The Nth percentile for the list of values, where N is the given percentage.
		// """
		if (!values)
			return 0.0
		sorted_values = sorted(values);
		var n = len(values);
		percentile /= 100;
		if (percentile <= 0.5 / n)
			return sorted_values[0]
		else if (percentile >= (n - 0.5) / n)
			return sorted_values[sorted_values.length - 1];
		else {
			floor_index = Math.floor(n * percentile - 0.5)
			floor_value = sorted_values[floor_index]
			ceil_value = sorted_values[floor_index + 1]
			alpha = n * percentile - 0.5 - floor_index
			return floor_value + alpha * (ceil_value - floor_value)
		}
	}

	/*def GeometricMean(values):
"""Compute a rounded geometric mean from an array of values."""
if not values:
return None
# To avoid infinite value errors, make sure no value is less than 0.001.
new_values = []
for value in values:
if value > 0.001:
  new_values.append(value)
else:
  new_values.append(0.001)
# Compute the sum of the log of the values.
log_sum = sum(map(math.log, new_values))
# Raise e to that sum over the number of values.
mean = math.pow(math.e, (log_sum / len(new_values)))
# Return the rounded mean.
return int(round(mean))

*/

	return {
		ArithmeticMean: ArithmeticMean,
		Total: Total,
		FrameDiscrepancy: FrameDiscrepancy,
		Percentile: Percentile
	};

}());