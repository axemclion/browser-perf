module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);
	grunt.initConfig({
		clean: ['tmp', 'test.log'],
		mochaTest: {
			options: {
				reporter: 'spec'
			},
			unit: {
				src: ['./test/test.helper.js', './test/unit/**/*.spec.js'],
			},
			e2e: {
				options: {
					timeout: 1000 * 60 * 5
				},
				src: ['./test/test.helper.js', './test/e2e/**/*.spec.js']
			}
		}
	});

	grunt.registerTask('dev', function() {
		var done = this.async();
		var browserPerf = require('./');
		browserPerf('http://localhost:9000', function(err, results) {
			if (err) {
				grunt.log.error(err);
			} else {
				grunt.log.ok('Got results', results);
			}
			done(err ? false : true);
		}, {
			configFile: 'test/res/selenium_debug.config.json'
		});
	});

	grunt.registerTask('test', ['clean', 'mochaTest']);
	grunt.registerTask('default', ['clean', 'test']);
}