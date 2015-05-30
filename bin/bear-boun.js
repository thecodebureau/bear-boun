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
		epiphany = new require('hatter')({ init: false, load: false }).epiphany;
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

	var epiphany = getEpiphany().epiphany;

	//epiphany.loaders.mongoose(epiphany.directories.models, epiphany.directories.plugins, epiphany.directories.schemas);

	require('../models/user')(epiphany.mongoose);

	epiphany.mongoose.connect(epiphany.config.mongo.uri);

	var User = epiphany.mongoose.model('User');

	var user = new User({email: email, local: { password: password } } );

	user.save(function(err, user){
		if(err) console.error(err);
		else console.log("Saved user: " + user.email);
		process.exit(0);
	});
}

function createOrganization() {
	var epiphany = getEpiphany().epiphany;

	require('../models/organization')(epiphany.mongoose);

	epiphany.mongoose.connect(epiphany.config.mongo.uri);

	var Organization = epiphany.mongoose.model('Organization');

	var organization = new Organization();

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
	var package = require(path.join(PWD, 'package.json'));
	var originalDependencies = package.dependencies;
	var gulpPackage = require(path.join(PWD, 'gulp', 'package.json'));

	package.dependencies = _.extend({}, package.dependencies, gulpPackage.dependencies, gulpPackage._environmentDependencies[ENV]);

	fs.writeFileSync(path.join(PWD, 'package.json'), JSON.stringify(package, null, '\t'));

	var spawn = require('child_process').spawn;

	var npmPrune = spawn('npm', [ 'prune' ]);

	npmPrune.stdout.on('data', function(chunk) {
		process.stdout.write(chunk);
	});

	npmPrune.on('close', function() {
		console.log('BEAR-BOUN: Finished removing extraneous packs, installing...');

		var npmInstall = spawn('npm',  ['install']);

		npmInstall.stdout.on('data', function(chunk) {
			process.stdout.write(chunk);
		});

		npmInstall.on('close', function() {
			console.log('BEAR-BOUN: Finished installing...');

			package.dependencies = originalDependencies;
			fs.writeFileSync(path.join(PWD, 'package.json'), JSON.stringify(package, null, '\t'));
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
