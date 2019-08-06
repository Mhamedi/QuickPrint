const { ipcRenderer: ipc } = require('electron');

let printers;

// let rendered = false;

ipc.on('print-data', (event, arg) => {
	const { data, options, printerName } = arg;

	// if (!rendered) {
	window.renderPrintData(data, options);

	// rendered = true;
	// }

	// document.body.innerHTML = printData;

	ipc.send('dispatch-print', { printerName });
});
