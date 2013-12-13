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
					base: ['./test/pages']
				}
			}
		},
		mochaTest: {
			test: {
				options: {
					reporter: 'spec',
					timeout: 1000 * 60
				},
				src: ['./test/**/*.spec.js']
			}
		}
	});

	grunt.registerTask('test', ['connect', 'mochaTest']);
	grunt.registerTask('default', ['clean', 'test']);
}