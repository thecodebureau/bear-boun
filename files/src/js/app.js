var Ridge = require('ridge');

var app = new Ridge({
	collections: require('./collections'),
	models: require('./models'),
	views: require('./views')
});

$(function() {
	app.navigation = new app.views.Navigation({ el: app.$('nav') });

	Backbone.history.start({ silent: true, pushState: true });
});

