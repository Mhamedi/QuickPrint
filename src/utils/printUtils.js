const winPrinterErrorCodes = require('../../winPrinterErrorCodes.json');

function findFaultyPrinter(printers) {
	const findCodes = statusCode => {
		const findParts = (exponent, prev, parts) => {
			const raisedValue = Math.pow(2, exponent);

			if (raisedValue > statusCode || prev > statusCode) {
				return null;
			}

			if (prev + raisedValue === statusCode) {
				return [...parts, raisedValue];
			}

			return (
				findParts(exponent + 1, prev + raisedValue, [...parts, raisedValue]) ||
				findParts(exponent + 1, prev, parts)
			);
		};

		return findParts(0, 0, []);
	};

	const faultyPrinterInfo =
		printers &&
		printers.reduce((acc, printer) => {
			if (acc) {
				return acc;
			} else if (printer.status === 0) {
				return null;
			}

			const errorCode = findCodes(printer.status).find(
				statusCode => winPrinterErrorCodes[statusCode]
			);

			return errorCode
				? { errorMessage: winPrinterErrorCodes[errorCode], printer }
				: null;
		}, null);

	return faultyPrinterInfo || {};
}

module.exports = { findFaultyPrinter };
