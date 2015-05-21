module.exports = function(mongoose) {
	var OrganizationSchema = new mongoose.Schema({
		dateCreated: { type: Date, default: Date.now }
	});

	mongoose.model('Organization', OrganizationSchema);
};
