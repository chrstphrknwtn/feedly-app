'use strict';

const fs = require('fs');
const path = require('path');
const electron = require('electron');

const app = electron.app;
const ipc = electron.ipcMain;
const shell = electron.shell;
const Menu = electron.Menu;
const BrowserWindow = electron.BrowserWindow;

const CSS = fs.readFileSync(path.join(__dirname, 'main.css'));

let mainWindow;

function emitUnreadCount() {
	mainWindow.webContents.executeJavaScript(`
		require('electron').ipcRenderer.send('unread', document.querySelector('[data-category="global.all"]').innerHTML);
	`);
}

function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 1260,
		minWidth: 1260,
		height: 1200,
		titleBarStyle: 'hiddenInset',
		frame: false,
		webPreferences: {allowDisplayingInsecureContent: true}
	});

	mainWindow.loadURL('https://feedly.com');

	// Add some custom CSS and show mainWindow
	mainWindow.webContents.on('did-finish-load', () => {
		mainWindow.webContents.insertCSS(`${CSS}`);
		mainWindow.webContents.executeJavaScript(`
			var pinNavInterval = setInterval(tryPinNav, 1000);

			function tryPinNav() {
				var pinNavButton = document.querySelector('[data-app-action="pinLeftNav"]');
				if (pinNavButton) {
					pinNavButton.click();
					clearInterval(pinNavInterval);
				}
			}
		`);
	});

	// Events on which to update the unread count
	['did-navigate-in-page', 'ready-to-show'].forEach(event => {
		mainWindow.webContents.on(event, emitUnreadCount);
	});

	// Open external links in default browser
	mainWindow.webContents.on('new-window', (e, url) => {
		if (url.indexOf('feedly.com') < 0) {
			e.preventDefault();
			shell.openExternal(url, {activate: false});
		}
	});

	// Don't destroy main window when clicking close button in title bar.
	mainWindow.on('close', e => {
		e.preventDefault();
		mainWindow.hide();
	});
}

// Create mainWindow
app.on('ready', () => {
	createMainWindow();

	const template = [
		{
			label: 'Application',
			submenu: [
				{label: 'About Feedly', selector: 'orderFrontStandardAboutPanel:'},
				{type: 'separator'},
				{label: 'Quit', accelerator: 'Command+Q', click: () => {
					app.quit();
				}}
			]
		}, {
			label: 'Edit',
			submenu: [
				{label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:'},
				{label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:'},
				{type: 'separator'},
				{label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:'},
				{label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:'},
				{label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:'},
				{label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:'}
			]
		}, {
			label: 'Window',
			submenu: [
				{label: 'Hide', accelerator: 'CmdOrCtrl+W', click: () => {
					mainWindow.hide();
				}},
				{type: 'separator'},
				{label: 'Main Window', accelerator: 'CmdOrCtrl+1', click: () => {
					mainWindow.show();
				}},
				{label: 'Dev Tools', accelerator: 'CmdOrCtrl+Option+i', click: () => {
					mainWindow.openDevTools();
				}}
			]
		}
	];

	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
});

// Set dock icon to unread count.
ipc.on('unread', (_, value) => {
	const count = value.toString();
	app.dock.setBadge(count.trim());
});

// Click on dock icon brings back mainWindow
app.on('activate', () => {
	mainWindow.show();
});

// Kill everything with cmd+q / actually quit
app.on('before-quit', () => {
	mainWindow.destroy();
});

// Quit gracefully
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
