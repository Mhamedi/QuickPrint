const fetch = require('node-fetch');
const { dialog } = require('electron');

const getOrderDetails = async options => {
	const { orderId, authHeader } = options;

	try {
		const headers = new fetch.Headers();
		headers.append('Authorization', authHeader);

		const response = await fetch(
			`https://api.urbanpiper.com/satellite/api/v1/orders/${orderId}`,
			{
				headers,
				method: 'POST'
			}
		);

		// console.log(response);

		const orderDetails = await response.json();

		return orderDetails;
	} catch (error) {
		console.log('failed', error);

		dialog.showErrorBox(
			'Network error',
			'Please ensure you are connected to the internet and try again'
		);
	}
};

module.exports = {
	getOrderDetails
};
