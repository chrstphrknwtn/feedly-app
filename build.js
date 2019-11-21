'use-strict';

const fs = require('fs');
const path = require('path');
const c = require('chalk');
const packager = require('electron-packager');
const appdmg = require('appdmg');

const pkg = require('./package.json');

const options = {
	dir: './',
	out: 'build',
	icon: 'icon/feedly.icns',
	overwrite: true,
	prune: true,
	appVersion: pkg.appVersion,
	appCopyright: pkg.appCopyright,
	buildVersion: pkg.version,
	platform: 'darwin',
	arch: 'x64',
	ignore: '/icon|images|build/'
};

/*
 * Package Electron App
 */
async function bundleElectronApp(options) {
	const appPaths = await packager(options);
	if (appPaths.length === 1) {
		/* Only darwin x64 specified, so there _should_ be only a single appPath and
		* this _should_ be suitable for creating a macOS installer dmg.
		*/
		createDmgInstaller(appPaths[0]);
	}
}
bundleElectronApp(options);

/*
 * Create Installer
 */
function createDmgInstaller(appPath) {
	const dmgPath = path.join(__dirname, options.out, `${pkg.productName}.dmg`);

	// Essentially overwrite if dmg already exists
	if (fs.existsSync(dmgPath)) {
		fs.unlinkSync(dmgPath);
	}

	const appDmg = {
		target: dmgPath,
		basepath: __dirname,
		specification: {
			title: pkg.productName,
			icon: 'icon/Feedly.icns',
			background: 'images/installer-background.png',
			contents: [
				{x: 448, y: 344, type: 'link', path: '/Applications'},
				{x: 192, y: 344, type: 'file', path: path.join(appPath, `${pkg.productName}.app`)}
			]
		}
	};

	const dmg = appdmg(appDmg);
	console.log(`Creating app DMG`);

	dmg.on('progress', info => {
		if (info.type === 'step-begin') {
			console.log(`  ${c.gray(info.title)}`);
		}
	});

	dmg.on('finish', () => {
		console.log(`\n${c.gray('Application:')} ${appPath}/${pkg.productName}.app`);
		console.log(`${c.gray('Installer:')}   ${options.out}/${pkg.productName}.dmg`);
	});

	dmg.on('error', err => {
		console.error(err);
	});
}
