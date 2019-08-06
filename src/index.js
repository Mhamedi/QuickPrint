const { ipcRenderer: ipc } = require('electron');
// const storage = require('electron-json-storage');

let printers;

document.querySelector('.update-btn').addEventListener('click', event => {
	const selectedPrinterInfo = Array.from(
		event.target.parentElement.previousElementSibling.querySelectorAll('select')
	).reduce((acc, selectElement) => {
		return {
			...acc,
			[selectElement.name]: selectElement.value
		};
	}, {});

	printers = printers.map(printer => {
		return {
			...printer,
			kitchenPrinter: printer.name === selectedPrinterInfo.kitchen,
			mainPrinter: printer.name === selectedPrinterInfo.main
		};
	});

	// renderPrinters(printers);
	toggleButtonDisable(true);

	ipc.send('update-printers', {
		printers
	});
});

// document.querySelectorAll('.selection-btn').forEach(buttonElement => {
// 	buttonElement.addEventListener('click', event => {
// 		const selectName = buttonElement.previousElementSibling.name;
// 		const selectValue = buttonElement.previousElementSibling.value;

// 		printers = printers.map(printer => {
// 			return {
// 				...printer,
// 				[`${selectName}Printer`]: printer.name === selectValue
// 			};
// 		});

// 		// renderPrinters(printers);

// 		ipc.send('update-printers', {
// 			printers
// 		});
// 	});
// });

function toggleButtonDisable(disabled) {
	document.querySelector('.update-btn').disabled = disabled;
}

function renderPrinters(printers) {
	// document.getElementById('printers').innerHTML = printers.map(
	// 	printer =>
	// 		`<div class="printer">${printer.name}
	// 			<div class="printer-make">${printer.options['printer-make-and-model']}</div>
	// 			${printer.mainPrinter ? `<div class="tag">${'Main'}</div>` : ''}
	// 			${printer.kitchenPrinter ? `<div class="tag">${'Kitchen'}</div>` : ''}
	// 		</div>`
	// );

	document.querySelectorAll('select').forEach(selectElement => {
		const selectType = selectElement.name;

		let isPrinterSelected = false;

		const printerOptions = printers.reduce((acc, printer) => {
			if (printer) {
				isPrinterSelected = true;
				return acc.concat([
					`<option ${printer[`${selectType}Printer`] ? 'selected' : ''}>${
						printer.name
					}</option>`
				]);
			} else {
				return acc;
			}
		}, []);

		selectElement.innerHTML = [
			`<option disabled ${
				isPrinterSelected ? 'selected' : ''
			}>Select a printer</option>`
		].concat(printerOptions);

		// selectElement.nextElementSibling.disabled = true;
	});
}

ipc.on('printers', (event, arg) => {
	// localStorage.setItem('printers', JSON.stringify(arg.printers));
	printers = arg.printers;

	console.log('got printers', printers);

	renderPrinters(printers);
});
