const packager = require('electron-packager');
const pkg = require('./package.json');

const options = {
	dir: './',
	out: './build',
	icon: './icon/feedly.icns',
	overwrite: true,
	prune: true,
	appVersion: pkg.appVersion,
	appCopyright: pkg.appCopyright,
	buildVersion: pkg.version,
	ignore: '/(icon)/'
};

packager(options, (err, appPaths) => {
	if (err) {
		console.error(err);
		return;
	}
	if (appPaths.length === 1) {
		console.log(`Write new app to ${appPaths[0]}`);
	} else {
		console.log('Write new apps to ');
		appPaths.forEach(path => {
			console.log(path, '\n');
		});
	}
});
