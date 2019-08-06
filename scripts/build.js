const electronInstaller = require('electron-winstaller');
const path = require('path');

const resultPromise = electronInstaller.createWindowsInstaller({
	appDirectory: path.resolve(__dirname, '..'),
	outputDirectory: path.resolve(__dirname, '../dist'),
	authors: 'UrbanPiper',
	exe: 'Satellite Client.exe',
	description: 'Desktop client for satellite',
	name: 'Satellite Client',
	iconUrl: path.resolve(__dirname, '../assets/icons/icon.png'),
	setupExe: `Satellite Client Setup`,
	noMsi: true
});

resultPromise.then(
	() => console.log('Build complete'),
	e => console.error(`Error: ${e.message}`)
);
