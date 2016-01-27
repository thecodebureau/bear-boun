module.exports = function(mw) {
	var public = [
		{
			title: 'Start',
			path: '/'
		}
	];

	public.pre = [];
	public.post = [];

	var admin = [
		{
			title: 'Dashboard',
			path: '/',
			template: 'admin/pages/index'
		}
	];

	admin.pre = [ mw.authorization.isAuthenticated, mw.setMaster('admin/master-one'), function(req, res, next) {
		if(!req.xhr)
			res.locals.navigation = epiphany.navigation.admin;

		next();
	} ];

	return {
		public: public,

		admin: admin,

		redirects: [
		//	[ '/coupon','/kupongen' ],
		]
	};
};
