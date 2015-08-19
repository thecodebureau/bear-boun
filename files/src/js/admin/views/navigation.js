module.exports = {
	initialize: function() {
		this.listenTo(this.app.router, 'route', this.onRouteChange);
	},

	onRouteChange: function(route, params) {
		this.$('li.current').removeClass('current');

		var path = (params[0] || 'dashboard').split('/');

		var $ref = this.$el.children('ul');

		while($ref.length > 0 && path.length > 0) {
			var $el = $ref.children('.' + path.shift());

			$el.addClass('current');

			$ref = $el.children('ul');
		}
	},

};
