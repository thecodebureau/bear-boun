var _ = require('lodash');

module.exports = function(mw, config, epiphany) {
	var navigation = [];

	return _.map(epiphany.navigation.public, function(route) {
		var mw = _.compact([ function(req, res, next) {
			res.page = route;
			res.navigation = _.map(navigation, function(item) {
				return item === route ? _.assign({ current: true }, item) : item;
			});

			next();
		} ].concat(route.mw));

		if (route.nav) navigation.push(route);

		return [ 'get', route.path || '/' + route.name, mw ];
	});
};
