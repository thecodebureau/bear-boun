var Ridge = require('ridge');

var app = new Ridge({
	router: {
		root: '/admin'
	},
	templateRoot: 'admin/',
	models: require('../models'),
	collections: require('../collections'),
	views: require('./views'),
	modules: [
		// hats > native
		//require('hats/admin'),
		//require('hats/organization/admin'),
		//require('hats/errors/admin'),
		//require('hats/news/admin'),
		//require('hats/gallery/admin'),
		//require('hats/employees/admin'),

		// hats > project
		//require('../../../hats/events/admin'),
		//require('../../../hats/sponsors/admin')
	]
});

window.broadcast = _.extend({}, Backbone.Events);

$(function() {
	app.navigation = new app.views.Navigation({ el: app.$('nav') });

	Backbone.history.start({ silent: true, pushState: true });
});
