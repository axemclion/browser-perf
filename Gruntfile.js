module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);
	grunt.initConfig({
		clean: {
			test: {
				src: ['test.log']
			}
		},
		connect: {
			all: {
				options: {
					port: 9000,
					hostname: '*',
					base: ['./test/res']
				}
			}
		},
		watch: {
			all: {
				files: [],
				tasks: []
			}
		},
		mochaTest: {
			options: {
				reporter: 'spec',
				timeout: 1000 * 60
			},
			unit: {
				src: ['./test/unit/**/*.spec.js'],
			},
			e2e: {
				src: ['./test/e2e/**/*.spec.js']
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

	grunt.registerTask('test', ['connect', 'mochaTest']);
	grunt.registerTask('default', ['clean', 'test']);
}