module.exports = function(mw, epiphany) {
	return _.map(epiphany.navigation.public, function(route) {
		var mw = _.compact([ function(req, res, next) {
			res.page = route;

			next();
		} ].concat(route.mw));

		return [ 'get', route.path || '/' + route.name, mw ];
	});
};
