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

function initUnreadCount() {
	mainWindow.webContents.executeJavaScript(`
		const { ipcRenderer } = require('electron');

		function init() {
			const target = document.querySelector('[title="All"] > .LeftnavListRow__count');

			// Call recursively until DOM element is present
			if (!target) {
				setTimeout(init, 500);
				return;
			}

			// Send initial unread value
			ipcRenderer.send('unread', target.innerHTML);

			// Observe unread value
			function subscriber(mutations) {
			  mutations.forEach((mutation) => {
					ipcRenderer.send('unread', mutation.target.textContent);
			  });
			}
			const observer = new MutationObserver(subscriber);

			observer.observe(target, {
			  characterData: true,
			  characterDataOldValue: true,
			  childList: true,
			  subtree: true
			});
		}
		init();
	`);
}

function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 1260,
		minWidth: 1260,
		maxWidth: 1260,
		height: 1600,
		titleBarStyle: 'hiddenInset',
		frame: false,
		webPreferences: {
      nodeIntegration: true,
			allowDisplayingInsecureContent: true
		}
	});

	mainWindow.loadURL('https://feedly.com');

	// Add some custom CSS, initialise unread count badge observer
	mainWindow.webContents.on('did-finish-load', () => {
		mainWindow.webContents.insertCSS(`${CSS}`);
		initUnreadCount();
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
