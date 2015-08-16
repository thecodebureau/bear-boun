var Epiphany = require('epiphany');

var server = new Epiphany({
	modules: require('./modules'),
	pages: require('./pages'),
	start: false
});

server.start();
