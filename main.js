'use strict';

const electron = require('electron');
const shell = require('electron').shell;

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipc = electron.ipcMain;

let mainWindow;

function injectIdleTimer() {
	mainWindow.webContents.executeJavaScript(`
    let t;
    window.onload = resetInterval;
		window.onscroll = resetInterval;

    document.onload = resetInterval;
    document.onmousemove = resetInterval;
    document.onmousedown = resetInterval;
    document.ontouchstart = resetInterval;
    document.onclick = resetInterval;
    document.onscroll = resetInterval;
    document.onkeypress = resetInterval;

    function backToAllTab() {
      document.getElementById('latesttab_label').click();
    }

    function resetInterval() {
      clearInterval(t);
      t = setInterval(backToAllTab, 300000); // 5 minutes
    }
	`);
}

function emitUnreadCount() {
	mainWindow.webContents.executeJavaScript(`
		require('electron').ipcRenderer.send('unread', document.querySelector('.simpleUnreadCount').innerHTML);
	`);
}

function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 1260,
		minWidth: 1080,
		height: 1200,
		titleBarStyle: 'hidden-inset',
		webPreferences: {allowDisplayingInsecureContent: true}
	});

	mainWindow.loadURL('https://feedly.com');

	// Add some custom CSS and show mainWindow
	mainWindow.webContents.on('did-finish-load', () => {
		mainWindow.webContents.insertCSS(`
			.dark #feedlyTabsHolder,
			.dark #feedlyTabs,
			.dark #addContentPlaceholderFX button {
				background-color:#181818 !important
			}
			#integrationstab_header,
			#integrationstab_icon,
			#integrationstab_label,
			#librarytab,
			#searchBarFX button.pro {
				display: none !important
			}
			html,body,h1,h2,h3,h4,h5,h6,p,ul,ol,li,
			h1 a,
			.title,
			.fx .entry .summary,
			.fx .button,.fx button,.fx-button {
				font-family: BlinkMacSystemFont !important;
				letter-spacing: 0 !important;
			}
			#searchBarFX,
			#headerBarFX {
				-webkit-app-region: drag;
			}`);
		mainWindow.show();
	});

	mainWindow.webContents.on('did-navigate-in-page', emitUnreadCount);
	mainWindow.webContents.on('dom-ready', () => {
		emitUnreadCount();
		injectIdleTimer();
	});

	// Open external links in default browser
	mainWindow.webContents.on('new-window', (e, url) => {
		console.log(url);
		if (url.indexOf('feedly.com') < 0) {
			e.preventDefault();
			shell.openExternal(url);
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
});

// Set dock icon to unread count.
// This is kind of pointless as the 'unread'
// event is triggered by interaction with the app, and also because feedly
// does not asyncronously update the unread count (you have to interact with
// the page).
// It's only good for starting up the app (which seems to not work 100% of the
// time) and for getting a 'last known value' when switching to another app.
ipc.on('unread', (_, value) => {
	let count = parseInt(value, 10);
	if (isNaN(count)) {
		app.dock.setBadge('');
	} else {
		app.dock.setBadge(count.toString());
	}
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
