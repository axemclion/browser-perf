require('q').longStackSupport = true;

if (!process.env.DEBUG) {
	process.env.DEBUG = 'bp:*';
}
