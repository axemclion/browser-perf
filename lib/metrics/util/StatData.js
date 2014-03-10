function StatData() {
	this.count = this.sum = this.sumsq = 0;
	this.max = this.min = null;
}

StatData.prototype.add = function(val) {
	if (typeof val === 'number') {
		this.count++;
		this.sum += val;
		this.sumsq += (val * val);
		if (this.max === null || val > this.max) {
			this.max = val;
		}
		if (this.min === null || val < this.min) {
			this.min = val;
		}
	}
};

StatData.prototype.getStats = function() {
	return {
		mean: this.count === 0 ? 0 : this.sum / this.count,
		max: this.max,
		min: this.min,
		sum: this.sum,
		count: this.count
	}
}

module.exports = StatData;