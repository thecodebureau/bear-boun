
setup
		console.log(bounPrefix + 'Fetching package info of "hats"');

		exec('npm view --json hats', function(error, stdout, stderr) {
			var done = function() {
				console.log(successPrefix + 'All dependencies fetched. Result:');
				console.log(deps);
				pkg.dependencies = deps;
				_writePackage(pkg);
				console.log(successPrefix + chalk.magenta('package.json') + ' written.');
				var git = spawn('git', [ 'init' ], { stdio: 'inherit' });

				git.on('close', function() {
					var gitSubmoduleAdd = spawn('git', [ 'submodule', 'add', 'https://github.com/thecodebureau/gulp.git' ], { stdio: 'inherit' });

					gitSubmoduleAdd.on('close', function() {
						exec('ln -sr ' + p.join(PWD, 'gulp', 'gulpfile.js') + ' ' + p.join(PWD, 'gulpfile.js'), function(error, stdout, stderr) {
							if (error !== null) {
								console.log('exec error: ' + error);
								console.log('stderr: ' + stderr);
								process.exit(1);
							}
							console.log(successPrefix + 'Finished setup');
						});
					});
				});
			};
			function add(name, version) {
				if(deps[name]) {
					if(deps[name] === version) {
						console.log(bounPrefix + 'Skipping package ' + name + '@' + version + ', is already a dependency.');
						return;
					}
	
					var current = _.trim(deps[name], '^~');
					var other = _.trim(version, '^~');

					// not, all version assumed to be correct semvar, thus arrays will
					// always be length 3
					for(var i = 0; i < 3; i++) {
						if(current[i] > other[i]) {
							console.log(bounPrefix + 'Skipping package ' + name + '@' + version + ', is already a dependency.');
							return;
						}
					}
				}

				deps[name] = version;
				console.log(bounPrefix + 'Package ' + chalk.cyan(name + '@' + version) + ' added as dependency.');
				return true;
			}
			var hatsPkg = JSON.parse(stdout);
			var deps = {};
			add('hats', '^' + hatsPkg.version);
			done = _.after(_.keys(hatsPkg.peerDependencies).length, done);

			_.each(hatsPkg.peerDependencies, function(version, name) {
				if(add(name, version)) {
					console.log(bounPrefix + 'Fetching peerDependencies for package ' + name + '@' + version + '.');
					exec('npm view --json ' + name + '@' + version, function(error, stdout, stderr) {
						_.each(JSON.parse(stdout).peerDependencies, function(version, name) {
							add(name, version);
							done();
						});
					});
				} else {
					done();
				}
			});
		});
