#!/bin/env node

var _ = require('lodash');

var PWD = process.env.PWD;
var ENV = process.env.NODE_ENV || 'development';

module.paths.unshift(PWD + '/node_modules');

var path = require('path');
var fs = require('fs');

function getEpiphany() {

	var epiphany;

	try {
		var Hatter = require('hatter');
		epiphany = new Hatter({ init: false, load: false }).epiphany;
	} catch (e) {
		epiphany = new require('epiphany')({ load: false, init: false });
	}

	return epiphany;
}

function createUser(email, password) {
	if(!email || !password) {
		console.log("Usage: bear-boun create-user email password");
		process.exit(0);
	}

	var epiphany = getEpiphany().load();


	//epiphany.loaders.mongoose(epiphany.directories.models, epiphany.directories.plugins, epiphany.directories.schemas);

	//require('../models/user')(epiphany.mongoose);
	epiphany.mongoose.connect(epiphany.config.mongo.uri);

	var User = epiphany.mongoose.model('User');

	var user = new User({email: email, local: { password: password } } );

	user.save(function(err, user){
		if(err) console.error(err);
		else console.log("Saved user: " + user.email);
		process.exit(0);
	});
}

function changePassword(email, password) {
	if(!email || !password) {
		console.log("Usage: bear-boun create-user email password");
		process.exit(0);
	}

	var epiphany = getEpiphany().load();

	epiphany.mongoose.connect(epiphany.config.mongo.uri);

	var User = epiphany.mongoose.model('User');

	User.findOne({ email: email }, function(err, user) {
		if(err) return console.error(err);

		if(!user) return console.error(new Error('No user with that email'));

		user.local = user.local || {};
		user.local.password = password;

		user.save(function(err, user){
			if(err) console.error(err);
			else console.log("Updated password for user: " + user.email);
			process.exit(0);
		});
	});
}


function createOrganization() {
	var epiphany = getEpiphany();

	epiphany.load();

	var Organization = epiphany.mongoose.model('Organization');

	var organization = new Organization();

	epiphany.mongoose.connect(epiphany.config.mongo.uri);

	organization.save(function(err, organization){
		if(err) console.error(err);
		else console.log("Saved empty organization");
		process.exit(0);
	});
}

function gulpSetup() {
	if(fs.existsSync(PWD + '/.gitmodules')) {
		var file = fs.readFileSync(PWD + '/.gitmodules', { encoding: 'utf8' });
		var modules = file.match(/\[submodule.*]/g).map(function(match) {
			return match.match(/"(.*)"/)[1];
		});
		if(modules.indexOf('gulp') > -1) 
			return console.log('BEAR-BOUN: TCB Gulp already seems to be a submodule.');
	}

	var spawn = require('child_process').spawn;

	var gitSubmoduleAdd = spawn('git', [ 'submodule', 'add', 'git@github.com:thecodebureau/gulp.git' ]);

	gitSubmoduleAdd.stdout.on('data', function(chunk) {
		process.stdout.write(chunk);
	});

	gitSubmoduleAdd.stderr.on('data', function(chunk) {
		process.stdout.write(chunk);
	});

	gitSubmoduleAdd.on('close', function() {
		fs.symlinkSync((path.join(PWD, 'gulp', 'gulpfile.js')), path.join(PWD, 'gulpfile.js'));
		console.log('BEAR-BOUN: Finished cloning tcb-gulp into project folder, and symlinked gulpfile.js...');
	});
}

function gulpDependencies() {
	var pkg = require(path.join(PWD, 'package.json'));
	var gulpPkg = require(path.join(PWD, 'gulp', 'package.json'));

	var originalDependencies = pkg.dependencies;

	//var dependencies = _.map(_.extend({}, pkg.dependencies, pkg._environmentDependencies[ENV]), function(value, key) {
	//	return key + '@' + value;
	//});

	pkg.dependencies = _.extend({}, pkg.dependencies, gulpPkg.dependencies, gulpPkg._environmentDependencies[ENV]);

	fs.writeFileSync(path.join(PWD, 'package.json'), JSON.stringify(pkg, null, '  '));

	var spawn = require('child_process').spawn;

	var npmPrune = spawn('npm', [ 'prune' ], { stdio: 'inherit' });

	npmPrune.on('close', function() {
		console.log('BOUN: Finished removing extraneous packs, installing...');

		//var npmInstall = spawn('npm',  ['install'].concat(dependencies), { stdio: 'inherit' });
		var npmInstall = spawn('npm',  ['install'], { stdio: 'inherit' });

		npmInstall.on('close', function() {
			console.log('BOUN: Finished installing, restoring package.json...');

			pkg.dependencies = originalDependencies;
			fs.writeFileSync(path.join(PWD, 'package.json'), JSON.stringify(pkg, null, '  ') + '\n');
		});
	});
}

function gulpConfig() {
	var epiphany = getEpiphany();

	var config = require(path.join(PWD, 'gulp', 'config.js'))(epiphany.config);

	fs.writeFileSync(path.join(PWD, 'gulpconfig.js'), 'module.exports = ' + JSON.stringify(config, null, '\t'));
	console.log('BEAR-BOUN: Gulp configurations written to PWD/gulpconfig.js.');
}

var argv = process.argv.slice(2);

switch(argv[0]) {
	case 'create-user':
		return createUser.apply(null, argv.slice(1));
	case 'change-password':
		return changePassword.apply(null, argv.slice(1));
	case 'create-organization':
		return createOrganization.apply(null, argv.slice(1));
	case 'gulp':
		switch(argv[1]) {
			case 'setup':
				return gulpSetup.apply(null, argv.slice(2));
			case 'update':
				return gulpUpdate.apply(null, argv.slice(2));
			case 'deps':
			case 'dependencies':
				return gulpDependencies.apply(null, argv.slice(2));
			case 'config':
				return gulpConfig.apply(null, argv.slice(2));
		}
}

console.log("Usage: bear-boun help");
