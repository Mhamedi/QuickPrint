(async () => {
	const getPort = require('get-port');
	const PORT = await getPort({ port: [16253, 16254, 16255] });

	const path = require('path');
	// Modules to control application life and create native browser window
	const {
		app,
		protocol,
		ipcMain: ipc,
		Tray,
		Menu,
		BrowserWindow,
		dialog
	} = require('electron');
	const storage = require('electron-json-storage');
	const express = require('express');
	const fetch = require('node-fetch');

	const bodyParser = require('body-parser');
	const testPrintData = require('./testPrintData.json');
	const { getOrderDetails } = require('./requests');
	const { findFaultyPrinter } = require('./src/utils/printUtils');

	// Keep a global reference of the window object, if you don't, the window will
	// be closed automatically when the JavaScript object is garbage collected.
	let mainWindow;
	let printWindow;
	let mainIcon = null;
	let printIcon = null;
	let printJobs = [];
	let initialLoad = true;

	// This application opens links that start with this protocol
	const PROTOCOL = 'sat://';
	const PROTOCOL_PREFIX = PROTOCOL.split(':')[0];

	let connectedPrinters;
	let storedPrinters;
	let selectedPrinters;
	let appFaultyPrinter = null;
	let isProtocolRegistered = false;

	const gotTheLock = app.requestSingleInstanceLock();

	if (!gotTheLock) {
		app.quit();
		return;
	} else {
		app.on('second-instance', (event, commandLine, workingDirectory) => {
			if (mainWindow) {
				if (mainWindow.isMinimized()) mainWindow.restore();
				mainWindow.show();
				mainWindow.focus();
			}
		});
	}

	const exeName = path.basename(process.execPath);
	app.setLoginItemSettings({
		openAtLogin: true,
		path: process.execPath,
		args: ['--processStart', '${exeName}', '--process-start-args', '--hidden']
	});

	if (!app.isDefaultProtocolClient(PROTOCOL_PREFIX)) {
		app.setAsDefaultProtocolClient(PROTOCOL_PREFIX);
	}

	function getPrinters() {
		connectedPrinters = mainWindow.webContents.getPrinters() || [];

		console.log(storedPrinters);

		const printers = connectedPrinters.map(connectedPrinter => {
			const printer = Array.isArray(storedPrinters)
				? storedPrinters.find(
						storedPrinter => storedPrinter.name === connectedPrinter.name
				  ) || connectedPrinter
				: connectedPrinter;

			return { ...printer, status: connectedPrinter.status };
		});

		return printers;
	}

	function getFaultyPrinters(authHeader) {
		const printers = getPrinters();

		// const disableAutoConfirm = () => {
		// 	if (authHeader) {
		// 		fetch(
		// 			'https://biz.urbanpiper.com/satellite/api/v1/store/settings/swiggy/',
		// 			{
		// 				method: 'POST',
		// 				headers: {
		// 					Authorization: authHeader,
		// 					'Content-Type': 'application/json'
		// 				},
		// 				data: JSON.stringify({
		// 					keys: [{ name: 'auto_confirm', value: '0' }]
		// 				})
		// 			}
		// 		)
		// 			.then(res => res.json())
		// 			.then(data => console.log(data));
		// 	}
		// };

		mainWindow.webContents.send('printers', {
			printers
		});

		selectedPrinters = printers.filter(
			printer => printer.kitchenPrinter || printer.mainPrinter
		);

		if (
			!initialLoad &&
			!(
				selectedPrinters &&
				(selectedPrinters.length === 2 ||
					(selectedPrinters.length === 1 &&
						selectedPrinters[0].mainPrinter &&
						selectedPrinters[0].kitchenPrinter))
			)
		) {
			printJobs = [];

			// dialog.showErrorBox(
			// 	'Printer not found',
			// 	'Please configure your printers and try again'
			// );

			// disableAutoConfirm();

			return {
				errorMessage: 'Printer not found',
				faultyPrinter: { name: 'not-found' }
			};
		}

		// const faultyPrinter =
		// 	selectedPrinters &&
		// 	selectedPrinters.find(
		// 		selectedPrinter => winPrinterErrCodes[`${selectedPrinter.status}`]
		// 	);

		const { errorMessage, printer: faultyPrinter } = findFaultyPrinter(
			selectedPrinters
		);

		appFaultyPrinter = faultyPrinter || null;

		if (!initialLoad && faultyPrinter) {
			printJobs = [];

			// disableAutoConfirm();

			// dialog.showErrorBox(
			// 	// winPrinterErrCodes[faultyPrinter.status],
			// 	errorMessage,
			// 	`Please check your ${
			// 		faultyPrinter.kitchenPrinter ? 'kitchen' : 'main'
			// 	} printer.`
			// );

			return { errorMessage, faultyPrinter };
		}

		return { errorMessage: '', faultyPrinter: null };
	}

	function dispatchPrint() {
		if (appFaultyPrinter) {
			return;
		}

		const options = printJobs[0];
		const { printKot, testPrint } = options;

		const printer = selectedPrinters.find(printer =>
			printKot ? printer.kitchenPrinter : printer.mainPrinter
		);

		if (options.testPrint) {
			printWindow.webContents.send('print-data', {
				data: testPrintData,
				options,
				printerName: printer.name
			});
		} else {
			getOrderDetails(options).then(data => {
				printWindow.webContents.send('print-data', {
					data,
					options,
					printerName: printer.name
				});
			});
		}
	}

	const server = express();
	server.use(bodyParser.json());
	server.use(bodyParser.urlencoded({ extended: false }));

	server.use((req, res, next) => {
		// Website you wish to allow to connect
		res.set('Access-Control-Allow-Origin', '*');

		// Request methods you wish to allow
		res.set(
			'Access-Control-Allow-Methods',
			'GET, POST, OPTIONS, PUT, PATCH, DELETE'
		);

		// Request headers you wish to allow
		res.set('Access-Control-Allow-Headers', 'Content-Type');

		next();
	});

	server.get('/', (req, res) => {
		res.status(200).json({
			satellitePrinter: true,
			faultyPrinterInfo:
				 getFaultyPrinters(req.query.authHeader)
		});
	});

	server.post('/print', (req, res) => {
		if (appFaultyPrinter) {
			res
				.status(405)
				.json({ errorMessage: 'One of the printers are unavailable' });
			return;
		}

		const { printFromSpecific } = req.body;

		const printFromKitchen = () => {
			printJobs.push({ ...req.body, printKot: true });
		};

		const printFromMain = () => {
			printJobs.push({ ...req.body, printKot: false });
		};

		if (printFromSpecific === 'kitchen') {
			console.log('kitchen request');

			printFromKitchen();
		} else if (printFromSpecific === 'main') {
			console.log('main request');
			printFromMain();
		} else {
			printFromMain();
			printFromKitchen();
		}

		// console.log(printJobs);

		if (
			(printFromSpecific && printJobs.length === 1) ||
			(!printFromSpecific && printJobs.length === 2)
		) {
			dispatchPrint();
		}

		res.status(200).json({ success: true });
	});

	const serverInstance = server.listen(PORT, () => {
		console.log(`Listening on port ${serverInstance.address().port}`);
	});

	function devToolsLog(s) {
		console.log(s);
		if (mainWindow && mainWindow.webContents) {
			mainWindow.webContents.executeJavaScript(`console.log("${s}")`);
		}
	}

	function createPrintWindow() {
		printWindow = new BrowserWindow({
			width: 500,
			// width: 1000,
			height: 450,
			// height: 800,
			maximizable: false,
			resizable: false,
			opacity: 0,
			webPreferences: {
				nodeIntegration: true
			},
			icon: path.resolve(__dirname, 'assets/icons/icon.png')
		});
		printWindow.setMenu(null);
		printWindow.hide();
		// printWindow.setOpacity(1);

		printIcon = new Tray(path.resolve(__dirname, 'assets/icons/print.png'));
		// printIcon.on('click', () => printWindow.show());

		printWindow.loadFile('src/print.html');
		// printWindow.webContents.openDevTools();

		printWindow.on('minimize', event => {
			printWindow.hide();
		});

		printWindow.on('close', event => {
			event.preventDefault();
			printWindow.hide();

			return false;
		});

		printWindow.on('closed', () => {
			// Dereference the window object, usually you would store windows
			// in an array if your app supports multi windows, this is the time
			// when you should delete the corresponding element.
			printWindow = null;
		});
	}

	function createWindow() {
		// Create the browser window.
		mainWindow = new BrowserWindow({
			width: 500,
			// width: 1000,
			height: 450,
			// height: 800,
			maximizable: false,
			resizable: false,
			webPreferences: {
				nodeIntegration: true
			},
			icon: path.resolve(__dirname, 'assets/icons/icon.png')
		});
		mainWindow.setMenu(null);

		mainIcon = new Tray(path.resolve(__dirname, 'assets/icons/icon.png'));
		mainIcon.on('click', () => mainWindow.show());

		// and load the src/index.html of the app.
		mainWindow.loadFile('src/index.html');
		// mainWindow.webContents.openDevTools();

		storage.get('sat-printers', (error, data) => {
			if (error) throw error;

			console.log('reached');

			storedPrinters = data;
			const printers = getPrinters();
			getFaultyPrinters();
			initialLoad = false;

			// TODO: Check if DOM Loaded
			mainWindow.webContents.on('dom-ready', () => {
				mainWindow.webContents.send('printers', {
					printers
				});
			});
		});

		mainWindow.on('minimize', event => {
			// mainWindow.hide();
		});

		mainWindow.on('close', event => {
			event.preventDefault();
			mainWindow.hide();

			return false;
		});

		// Emitted when the window is closed.
		mainWindow.on('closed', () => {
			// Dereference the window object, usually you would store windows
			// in an array if your app supports multi windows, this is the time
			// when you should delete the corresponding element.
			mainWindow = null;
		});

		if (isProtocolRegistered) {
			return;
		}

		protocol.registerHttpProtocol(
			PROTOCOL_PREFIX,
			(req, cb) => {
				devToolsLog('requested', req.url);

				mainWindow.loadFile('src/index.html');
			},
			err => {
				if (!err) {
					isProtocolRegistered = true;
					console.log('registered todo protocol');
				} else {
					console.error('could not register todo protocol');
					console.error(err);
				}
			}
		);

		createPrintWindow();
	}

	// This method will be called when Electron has finished
	// initialization and is ready to create browser windows.
	// Some APIs can only be used after this event occurs.
	app.on('ready', createWindow);

	// Quit when all windows are closed.
	app.on('window-all-closed', () => {
		// On macOS it is common for applications and their menu bar
		// to stay active until the user quits explicitly with Cmd + Q
		if (process.platform !== 'darwin') {
			app.quit();
		}
	});

	app.on('activate', () => {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (mainWindow === null) {
			createWindow();
		}
	});

	// In this file you can include the rest of your app's specific main process
	// code. You can also put them in separate files and require them here.

	ipc.on('update-printers', (event, arg) => {
		const { printers } = arg;

		storage.set('sat-printers', printers, err => {
			if (err) console.error(err);
			else {
				storedPrinters = printers;

				event.sender.webContents.send('printers', {
					printers
				});
			}
		});
	});

	ipc.on('dispatch-print', (event, arg) => {
		console.log('Initiating print');
		const { printerName } = arg;

		if (
			connectedPrinters.findIndex(
				connectedPrinter => connectedPrinter.name === printerName
			) === -1
		) {
		} else {
			event.sender.webContents.print(
				{ silent: true, deviceName: printerName },
				success => {
					if (success) {
						console.log('print complete');
					} else {
						console.log('print failed');
						// dialog.showErrorBox(
						// 	'Print failed',
						// 	'Please check if your printer is connected and try again'
						// );
					}

					printJobs.shift();

					if (printJobs.length) {
						dispatchPrint();
					}
				}
			);
		}
	});
})();
