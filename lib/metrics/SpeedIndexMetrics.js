var BaseMetrics = require('./BaseMetrics'),
  SpeedIndexProbe = require('../probes/SpeedIndexProbe');

function SpeedIndexMetrics() {
  BaseMetrics.apply(this, arguments);
}
require('util').inherits(SpeedIndexMetrics, BaseMetrics);

SpeedIndexMetrics.prototype.id = 'SpeedIndexMetrics';
SpeedIndexMetrics.prototype.probes = ['SpeedIndexProbe'];

SpeedIndexMetrics.prototype.onData = function(data) {
  this.timing = data;
};

SpeedIndexMetrics.prototype.getResults = function() {
  return this.timing;
};

module.exports = SpeedIndexMetrics;