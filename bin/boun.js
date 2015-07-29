#!/bin/env node

var _ = require('lodash');

global.PWD = process.env.PWD;
global.ENV = process.env.NODE_ENV || 'development';

module.paths.unshift(PWD + '/node_modules');

var p = require('path');
var fs = require('fs');


var chalk = require('chalk');
// NOTE prompt uses colors, not chalk
var prompt = require('prompt');

prompt.message = "[" + "?".yellow + "]";

var bounPrefix = '[' + chalk.yellow('BOUN') + '] ';
var successPrefix = '[' + chalk.green('SUCCESS') + '] ';
var errorPrefix = '[' + chalk.red('ERROR') + '] ';

function writePackage(pkg) {
	fs.writeFileSync(p.join(PWD, 'package.json'), JSON.stringify(pkg, null, '  ') + '\n');
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
		else console.log(bounPrefix + "Saved user: " + user.email);
		process.exit(0);
	});
}

function changePassword(email, password) {
	if(!email || !password) {
		console.log("Usage: boun create-user [email] [password]");
		process.exit(0);
	}

	var epiphany = getEpiphany().load();

	epiphany.mongoose.connect(epiphany.config.mongo.uri);

	var User = epiphany.mongoose.model('User');

	User.findOne({ email: email }, function(err, user) {
		if(err) return console.error(err);

		if(!user) return console.error(errorPrefix + 'No user with that email');

		user.local = user.local || {};
		user.local.password = password;

		user.save(function(err, user){
			if(err) console.error(err);
			else console.log(bounPrefix + "Updated password for user: " + user.email);
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
		else console.log(successPrefix + "Saved empty organization");
		process.exit(0);
	});
}

function setup() {
	var childProcess = require('child_process');

	var copyFiles = childProcess.exec('cp -vr ' + p.normalize(p.join(__dirname, '../files/*')) + ' ' + PWD + '/', function(error, stdout, stderr) {
																																											 
		console.log(stdout);

		if (error !== null) {
			console.log(errorPrefix + 'exec error: ' + error);
			console.log(errorPrefix + 'stderr: ' + stderr);
			process.exit(1);
		}

		var spawn = childProcess.spawn;

		var git = spawn('git', [ 'init' ], { stdio: 'inherit' });

		git.on('close', function() {
			var gitSubmoduleAdd = spawn('git', [ 'submodule', 'add', 'git@github.com:thecodebureau/gulp.git' ], { stdio: 'inherit' });

			gitSubmoduleAdd.on('close', function() {
				childProcess.exec('ln -sr ' + p.join(PWD, 'gulp', 'gulpfile.js') + ' ' + p.join(PWD, 'gulpfile.js'), function(error, stdout, stderr) {
					if (error !== null) {
						console.log('exec error: ' + error);
						console.log('stderr: ' + stderr);
						process.exit(1);
					}
					console.log(successPrefix + 'Finished setup');
				});
			});
		});
	});
}

function install(prune) {
	// TODO restore package.json on error or exit
	prune = prune === '-p';

	var spawn = require('child_process').spawn;
	// NOTE we write a new package.json file for effeciency. Calling npm install with array of packages
	// will redownload and install even if correct version already exists.
	var pkg = require(p.join(PWD, 'package.json'));
	var gulpPkg = require(p.join(PWD, 'gulp', 'package.json'));
	var originalDependencies = pkg.dependencies;

	pkg.dependencies = _.extend({}, pkg.dependencies, gulpPkg.dependencies, gulpPkg._environmentDependencies[ENV]);

	writePackage(pkg);

	//var dependencies = _.extend({}, pkg.dependencies, gulpPkg.dependencies);
	//dependencies = _.pairs(dependencies).map(function(arr) {
	//	return arr[0] + '@' + arr[1];
	//});

	if(prune) {
		var npmPrune = spawn('npm', [ 'prune' ], { stdio: 'inherit' });

		npmPrune.on('close', function() {
			console.log(bounPrefix + 'Finished removing extraneous packs, installing...');
			run();
		});
	} else {
		run();
	}

	function run() {
		var npmInstall = spawn('npm',  ['install'], { stdio: 'inherit' });
		//var npmInstall = spawn('npm',  ['install'].concat(dependencies), { stdio: 'inherit' });

		npmInstall.on('close', function() {
			pkg.dependencies = originalDependencies;
			writePackage(pkg);

			console.log(successPrefix + 'All dependencies installed successfully.');
		});
	}
}

function dependencies() {
	var modulesFile = p.join(PWD, 'server/modules.js');
	var modules;
	if(fs.existsSync(modulesFile)) {
		modules = require(p.join(PWD, 'server/modules.js'));
		var appPkg = require(p.join(PWD, 'package.json'));

		modules.forEach(function(module) {
			var pkg = require(p.join(/\.\//.test(module) ? PWD : '', module, 'package.json'));

			console.log(bounPrefix + 'Adding dependencies from ' + chalk.green(module));
			console.log(_.pairs(pkg.dependencies).map(function(arr) {
				return arr[0] + '@' + arr[1];
			}).join('\n - '));

			_.extend(appPkg.dependencies, pkg.dependencies);
		});
		writePackage(appPkg);

		console.log(successPrefix + 'Collected dependencies written to package.json.');

	}

	if(!modules || modules.length === 0) {
		console.log(bounPrefix + 'No modules found.');
	}

		
}

function gulpConfig() {
	var config = require(p.join(PWD, 'gulp', 'config.js'));

	fs.writeFileSync(p.join(PWD, 'gulpconfig.js'), 'module.exports = ' + JSON.stringify(config, null, '\t'));
	console.log(successPrefix + 'Gulp configurations written to PWD/gulpconfig.js.');
}

function config(argv) {
	var dirs = [ p.join(PWD, 'node_modules/epiphany/lib/config') ];


	var modulesFile = p.join(PWD, 'server/modules.js');
	if(fs.existsSync(modulesFile)) {
		var modules = require(moduleFile);
		var appPkg = require(p.join(PWD, 'package.json'));

		modules.forEach(function(module) {
			var modulePath = p.join(PWD, /\.\//.test(module) ? '' : 'node_modules', module);
			var configPath = p.join(modulePath, 'config');
			if(fs.existsSync(configPath))
				dirs.push(configPath);

			configPath = p.join(modulePath, 'server', 'config');

			if(fs.existsSync(configPath))
				dirs.push(configPath);
		});
	}

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

		var next = recurse.bind(null, paths, ++i, paths === dirs ? null : root, parentNext);

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
			var targetRelative = './' + p.relative(dest, target);
			var pathRelative = './' + p.relative(root, path);

			var exists;
			if(exists = fs.existsSync(target)) {
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

				if(!exists || result.yesno === 'y') {
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
		return dependencies.apply(null, argv.slice(1));
	case 'install':
		return install.apply(null, argv.slice(1));
	case 'setup':
		return setup.apply(null, argv.slice(1));
	case 'gulp':
		switch(argv[1]) {
			case 'config':
				return gulpConfig.apply(null, argv.slice(2));
		}
}

console.log("Usage: boun help");
