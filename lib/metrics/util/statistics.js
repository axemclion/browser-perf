/*
Based on 
https://chromium.googlesource.com/chromium/src/+/6df438ed2adaf24fa2f4a92d4f3863825247b910/tools/telemetry/telemetry/util/statistics.py
*/

/* 
Returns the float value of a number or the sum of a list.
*/
function Total(data) {
	if (typeof data === 'number') {
		return data;
	} else if (Array.isArray(data)) {
		return data.reduce(function(previousValue, currentValue, index, array) {
			return previousValue + currentValue;
		});
	}
}

/* 
Returns the quotient, or zero if the denominator is zero
*/
function DivideIfPossibleOrZero(numerator, denominator) {
	return denominator ? numerator / denominator : 0;
}

/*
 Calculates arithmetic mean.

  Args:
    data: A list of samples.

  Returns:
    The arithmetic mean value, or 0 if the list is empty.
*/
function ArithmeticMean(data) {
	numerator_total = Total(data);
	denominator_total = Total(data.length);
	return DivideIfPossibleOrZero(numerator_total, denominator_total);
}

/*
Sorts the samples, and map them linearly to the range [0,1].

They're mapped such that for the N samples, the first sample is 0.5/N and the
last sample is (N-0.5)/N.

Background: The discrepancy of the sample set i/(N-1); i=0, ..., N-1 is 2/N,
twice the discrepancy of the sample set (i+1/2)/N; i=0, ..., N-1. In our case
we don't want to distinguish between these two cases, as our original domain
is not bounded (it is for Monte Carlo integration, where discrepancy was
first used).
*/
function NormalizeSamples(samples) {
	if (!samples) {
		return 1;
	}
	samples = samples.sort();
	var low = Math.min.apply(null, samples);
	var high = Math.max.apply(null, samples);
	var new_low = 0.5 / samples.length;
	var new_high = (samples.length - 0.5) / samples.length;
	if (high - low == 0.0) {
		return {
			samples: samples.map(function(s) {
				return 0.5;
			}),
			scale: 1
		}
	}
	var scale = (new_high - new_low) / (high - low);
	for (var i = 0; i < samples.length; i++) {
		samples[i] = (samples[i] - low) * scale + new_low
	}
	return {
		samples: samples,
		scale: scale
	}
}

/*
Clamp a value between some low and high value
*/
function Clamp(value, low, high) {
	low = typeof low === 'undefined' ? 0 : low;
	high = typeof high === 'undefined' ? 0 : high;
	console.log(value, low, high)
	return Math.min(Math.max(value, low), high);
}

/*
Computes the discrepancy of a set of 1D samples from the interval [0,1].

The samples must be sorted. We define the discrepancy of an empty set
of samples to be zero.

http://en.wikipedia.org/wiki/Low-discrepancy_sequence
http://mathworld.wolfram.com/Discrepancy.html
*/

function Discrepancy(samples, location_count) {
	if (!samples) {
		return 0;
	}

	var max_local_discrepancy = 0;
	var inv_sample_count = 1.0 / samples.length;
	var locations = [],
		count_less = [],
		count_less_equal = [];

	if (location_count) {
		//Generate list of equally spaced locations.
		var sample_index = 0;
		for (var i = 0; i < location_count; i++) {
			var location = i / location_count - 1;
			locations.push(location);
			while (sample_index < samples.length && samples[sample_index] < location)
				sample_index += 1;
			count_less.push(sample_index);
			while (sample_index < samples.length && samples[sample_index] <= location)
				sample_index += 1;
			count_less_equal.push(sample_index);
		}
	} else {
		if (samples[0] > 0.0) {
			locations.push(0.0);
			count_less.push(0);
			count_less_equal.push(0);
		}
		for (var i = 0; i < samples.length; i++) {
			locations.push(samples[i]);
			count_less.push(i);
			count_less_equal.push(i + 1);
		}
		if (samples[-1] < 1.0) {
			locations.push(1.0);
			count_less.push(samples.length);
			count_less_equal.push(samples.length);
		}
	}

	// Iterate over the intervals defined by any pair of locations.
	for (var i = 0; i < locations.length; i++) {
		for (var j = i + 1; j < locations.length; j++) {
			// # Length of interval
			var length = locations[j] - locations[i];

			// Local discrepancy for closed interval
			var count_closed = count_less_equal[j] - count_less[i];
			var local_discrepancy_closed = Math.abs(count_closed * inv_sample_count - length);
			var max_local_discrepancy = Math.max(local_discrepancy_closed, max_local_discrepancy);

			// Local discrepancy for open interval
			var count_open = count_less[j] - count_less_equal[i];
			var local_discrepancy_open = Math.abs(count_open * inv_sample_count - length);
			var max_local_discrepancy = Math.max(local_discrepancy_open, max_local_discrepancy);
		}
	}
	return max_local_discrepancy;
}

/*
A discrepancy based metric for measuring timestamp jank.

TimestampsDiscrepancy quantifies the largest area of jank observed in a series
of timestamps.  Note that this is different from metrics based on the
max_time_interval. For example, the time stamp series A = [0,1,2,3,5,6] and
B = [0,1,2,3,5,7] have the same max_time_interval = 2, but
Discrepancy(B) > Discrepancy(A).

Two variants of discrepancy can be computed:

Relative discrepancy is following the original definition of
discrepancy. It characterized the largest area of jank, relative to the
duration of the entire time stamp series.  We normalize the raw results,
because the best case discrepancy for a set of N samples is 1/N (for
equally spaced samples), and we want our metric to report 0.0 in that
case.

Absolute discrepancy also characterizes the largest area of jank, but its
value wouldn't change (except for imprecisions due to a low
|interval_multiplier|) if additional 'good' intervals were added to an
exisiting list of time stamps.  Its range is [0,inf] and the unit is
milliseconds.

The time stamp series C = [0,2,3,4] and D = [0,2,3,4,5] have the same
absolute discrepancy, but D has lower relative discrepancy than C.

|timestamps| may be a list of lists S = [S_1, S_2, ..., S_N], where each
S_i is a time stamp series. In that case, the discrepancy D(S) is:
D(S) = max(D(S_1), D(S_2), ..., D(S_N))
*/
function TimestampsDiscrepancy(timestamps, absolute, location_count) {
	absolute = typeof absolute === 'undefined' ? true : absolute;
	location_count = typeof location_count === 'undefined' ? null : location_count;

	if (!timestamps) {
		return 0;
	}

	var normal = NormalizeSamples(timestamps);
	var samples = normal.samples,
		sample_scale = normal.scale;
	var discrepancy = Discrepancy(samples, location_count);
	var inv_sample_count = 1.0 / samples.length;

	if (absolute)
		discrepancy /= sample_scale;
	else
		discrepancy = Clamp((discrepancy - inv_sample_count) / (1.0 - inv_sample_count));
	return discrepancy;
}

module.exports = {
	ArithmeticMean: ArithmeticMean,
	TimestampsDiscrepancy: TimestampsDiscrepancy
};