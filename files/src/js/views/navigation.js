module.exports = {
	events: {
		'mouseover ul': 'dud',
		'mouseout ul': 'dud',
		'click i, div.cover, ul': 'toggleMobile',
	},

	toggleMobile: function(e) {
		if(document.body.clientWidth < 640) {
			this.$('ul').toggleClass('show').on('touchmove', function(e) {
				e.preventDefault();
			});
			$(document.body).toggleClass('push');
			// breaks iOS:
			this.$('div.cover').toggleClass('active');
		}
	},

	dud: function() {
		var $element = this.$('li:hover'),
			left, width;

		if($element.length === 0)
			$element = this.$('li.current');

		this.$el.children('.dud').toggleClass('active', $element.length !== 0).css({
			left: $element.length === 0 ? '' : $element[0].offsetLeft + 'px',
			width: $element.length === 0 ? 0 : $element.width() + 'px'
		});
	},

	initialize: function(options) {
		this.listenTo(this.app.router, 'route', this.onRouteChange);
	},

	attach: function() {
		// wait for fonts to load
		setTimeout(this.dud.bind(this), 300);
	},

	onRouteChange: function(route, params) {
		$(document.body).removeClass('push');

		var path = params[0];

		path = path ? path.split('/')[0] : 'index';

		this.$('li.current').removeClass('current');
		this.$('li.' + path).addClass('current');

		this.dud();
	}
};
