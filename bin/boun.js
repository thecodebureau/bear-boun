#!/bin/env node

var _ = require('lodash');

global.PWD = process.env.PWD;
global.ENV = process.env.NODE_ENV || 'development';

module.paths.unshift(PWD + '/node_modules');

var p = require('path');
var fs = require('fs');

var prompt = require('prompt');

prompt.message = "[" + "?".yellow + "]";

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
		fs.symlinkSync((p.join(PWD, 'gulp', 'gulpfile.js')), p.join(PWD, 'gulpfile.js'));
		console.log('BEAR-BOUN: Finished cloning tcb-gulp into project folder, and symlinked gulpfile.js...');
	});
}

function installDependencies() {
	var pkg = require(p.join(PWD, 'package.json'));
	var gulpPkg = require(p.join(PWD, 'gulp', 'package.json'));

	var originalDependencies = pkg.dependencies;

	//var dependencies = _.map(_.extend({}, pkg.dependencies, pkg._environmentDependencies[ENV]), function(value, key) {
	//	return key + '@' + value;
	//});

	pkg.dependencies = _.extend({}, pkg.dependencies, gulpPkg.dependencies, gulpPkg._environmentDependencies[ENV]);

	fs.writeFileSync(p.join(PWD, 'package.json'), JSON.stringify(pkg, null, '  '));

	var spawn = require('child_process').spawn;

	var npmPrune = spawn('npm', [ 'prune' ], { stdio: 'inherit' });

	npmPrune.on('close', function() {
		console.log('BOUN: Finished removing extraneous packs, installing...');

		//var npmInstall = spawn('npm',  ['install'].concat(dependencies), { stdio: 'inherit' });
		var npmInstall = spawn('npm',  ['install'], { stdio: 'inherit' });

		npmInstall.on('close', function() {
			console.log('BOUN: Finished installing, restoring package.json...');

			pkg.dependencies = originalDependencies;
			fs.writeFileSync(p.join(PWD, 'package.json'), JSON.stringify(pkg, null, '  ') + '\n');
		});
	});
}

function gulpConfig() {
	var config = require(p.join(PWD, 'gulp', 'config.js'));

	fs.writeFileSync(p.join(PWD, 'gulpconfig.js'), 'module.exports = ' + JSON.stringify(config, null, '\t'));
	console.log('BOUN: Gulp configurations written to PWD/gulpconfig.js.');
}

function config(argv) {
	var dirs = [ p.join(PWD, 'node_modules/epiphany/lib/config') ];

	var dest = p.join(PWD, 'server', 'config');

	var dontOverwrite = !!argv[0] || argv[0] === '-n'; 

	prompt.start();

	recurse(dirs);

	// this shit is all done because prompt is always asynchronous. if
	// this stupid gay ass code isn't used, the script will continue
	// instead of waiting for the previous prompt to be answered.
	function recurse(paths, i, root, parentNext) {
		i = i || 0;

		var path = paths[i];

		root = root || path;

		var next = recurse.bind(null, paths, ++i, root, parentNext);

		if(!path || !fs.existsSync(path)) {
			return parentNext ? parentNext() : undefined;
		}

		if(fs.statSync(path).isDirectory()) {
			var files = fs.readdirSync(path).map(function(file) {
				return p.join(path, file);
			});

			recurse(files, 0, root, next);
		} else {
			var questions = [];
			var target = (p.join(dest, p.relative(root, path)));
			var targetRelative = './' + p.relative(PWD, target);
			var pathRelative = './' + p.relative(PWD, path);

			if(fs.existsSync(target)) {
				if(!dontOverwrite)
					questions.push({
						name: 'yesno',
						message: ('Overwrite ' + targetRelative.yellow  + ' with ' + pathRelative.yellow + '?').white,
						validator: /y[es]*|n[o]?/,
						warning: 'Must respond yes or no',
						default: 'no'
					});
			} else {
				var parentDir = p.dirname(target);

				while(!fs.existsSync(parentDir)) {
					fs.mkdirSync(parentDir);
					parentDir = p.dirname(parentDir);
				}
			}

			prompt.get(questions, function(err, result) {
				if(err) process.exit(0);

				if(!dontOverwrite && (questions.length === 0 || result.yesno === 'y')) {
					console.log(pathRelative.magenta + ' > ' + targetRelative.magenta);
					fs.createReadStream(path).pipe(fs.createWriteStream(target));
				}

				next();
			});

		}
	}
}

var argv = process.argv.slice(2);

switch(argv[0]) {
	case 'config':
		return config.call(null, argv.slice(1));
	case 'create-user':
		return createUser.apply(null, argv.slice(1));
	case 'change-password':
		return changePassword.apply(null, argv.slice(1));
	case 'create-organization':
		return createOrganization.apply(null, argv.slice(1));
	case 'deps':
	case 'dependencies':
	case 'install':
		return installDependencies.apply(null, argv.slice(1));
	case 'gulp':
		switch(argv[1]) {
			case 'setup':
				return gulpSetup.apply(null, argv.slice(2));
			case 'update':
				return gulpUpdate.apply(null, argv.slice(2));
			case 'config':
				return gulpConfig.apply(null, argv.slice(2));
		}
}

console.log("Usage: boun help");
