function renderPrintData(data, options, selector) {
	const styles = `
	.bill * {
		font-family: Arial;
		font-size: 14px;
	}

	.bill {
		width: 300px;
	}

	.bill__row {
		display: flex;
		justify-content: space-between;
		padding: 3px 0;
	}

	.bill__section {
		padding: 5px 0;
		border-bottom: 1px solid #2f3121;
	}

	.bill__txt-b {
		text-transform: uppercase;
		font-weight: bold;
	}

	.bill__txt-n {
		font-weight: bold;
		text-align: center;
		font-size: 12px;
	}

	.bill__img {
		display: block;
		max-height: 70px;
		margin: 0 auto;
	}

	.bill__img + .bill__txt-b {
		margin-bottom: 15px;
	}

	.bill__ins-container {
		padding: 8px 0;
		border-top: 1px solid #2f3121;
	}

	.bill__ins {
		padding: 10px 0;
		white-space: pre-line;
	}

	.bill__item-options {
		margin-left: 10px;
	}

	.bill__item-extra {
		padding: 0 3px;
		font-size: 12px;
		text-transform: uppercase;
	}

	.bill__lst {
		padding: 15px 0;
	}

	.bill__kot {
		margin-top: 10px;
		border-top: 1px solid #2f3121;
	}

	.bill__barcode_container {
		text-align: center;
	}

	.swiggy-barcode {
		width: 100%;
	}
`;

	const parent = selector || document.body;

	const { order, customer } = data;
	console.log(data);

	const { biz, printKot, printOrderSlip, operator } = options;

	const { details: orderDetails, store } = order;

	const paymentOption = order.payment.length ? order.payment[0].option : null;

	const {
		total_taxes: totalTaxes,
		total_charges: totalCharges,
		total_external_discount: totalDiscount,
		ext_platforms: extPlatforms,
		channel
	} = orderDetails;

	const paymentModeLabels = {
		cash: 'Cash',
		payment_gateway: 'Online payment',
		prepaid: 'Wallet',
		aggregator: orderDetails.channel
	};

	const extChannel = extPlatforms.find(
		extPlatform => extPlatform.name === channel
	);
	const extChannelId = extChannel ? extChannel.id : null;

	const walletCreditApplied = order.payment.find(
		paymentMode => paymentMode.option === 'wallet_credit'
	);

	const deliveryTime = new Date(
		orderDetails.delivery_datetime
	).toLocaleDateString('en-us', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: 'numeric',
		minute: 'numeric'
	});

	const getAddress = () => {
		const {
			tag,
			line_1: line1,
			line_2: line2,
			landmark,
			sub_locality: subLocality,
			city,
			pin
		} = customer.address;

		return `
			${tag ? `${tag},<br />` : ''}
			${line1 ? `${line1},<br />` : ''}
			${line2 ? `${line2},<br />` : ''}
			${landmark ? `${landmark},<br />` : ''}
			${subLocality ? `${subLocality},<br />` : ''}
			${city ? `${city}${pin ? ` - ${pin}` : ''}` : ''}
		`;
	};

	const paymentRow = `
		<div class="bill__row">
			<div>Payment:</div>
			<div>
				<span class="bill__txt-b">
					${order.payment[0].option === 'cash' ? 'NOT ' : ''}PAID
				</span> 
				(${paymentModeLabels[order.payment[0].option] || order.payment[0].option})
			</div>
		</div>
	`;

	const instructionsRow = `
		<div class="bill__section bill__ins-container">			
			<div class="bill__txt-b">ORDER INSTRUCTIONS</div>
			<div class="bill__ins">${orderDetails.instructions || '--'}</div>
		</div>
	`;

	const kot = `
		<div class="bill__kot">
			<div class="bill__section bill__txt-n">
				<div>${biz.name}</div>
				<div class="bill__txt-n">Kitchen KOT</div>
			</div>

			<div class="bill__section">
				<div class="bill__row">
					<div>Order ID:</div>
					<div>${orderDetails.id}</div>
				</div>

				<div class="bill__row">
					<div>Channel:</div>
					<div>${orderDetails.channel}</div>
				</div>

				<div class="bill__row">
					<div>Channel ID:</div>
					<div>${extChannelId || 'NA'}</div>
				</div>

				<div class="bill__row">
					<div>Order type:</div>
					<div>${orderDetails.order_type}</div>
				</div>

				<div class="bill__row">
					<div>${orderDetails.order_type[0].toUpperCase() +
						orderDetails.order_type.slice(1)} Time:</div>
					<div>${deliveryTime}</div>
				</div>
				
				<div class="bill__row">
					<div>Outlet:</div>
					<div>${store.name}</div>
				</div>
				
				${paymentRow}
			</div>


			<div class="bill__section">
				<div class="bill__row">
					<div><b>Item</b></div>
					<div><b>Qty</b></div>
				</div>
			</div>
			<div class="bill__section">
				${order.items.map(
					item => `
						<div class="bill__row">
							<div>${item.title}</div>
							${
								item.options_to_add.length
									? `
											<div class="bill__item-options">
												${item.options_to_add.map(option => `<div>${option.title}</div>`)}
											</div>
										`
									: ''
							}
							<div>${item.quantity}</div>
						</div>
					`
				)}
			</div>								

			${
				extChannelId
					? `
						<div class="bill__row bill__barcode_container">
							<svg class="swiggy-barcode" id="order_slip_swiggy_barcode" />
						</div>
					`
					: ''
			}

			${instructionsRow}
			
		</div>
	</div>
	</div>
	`;

	parent.innerHTML = printKot
		? `
			<div class="bill">
				<style>${styles}</style>

				${kot}
			</div>
		`
		: `
		<div class="bill">
			<style>${styles}</style>

			<div class="bill__section bill__row bill__txt-b">
				<div>${orderDetails.order_type}</div>
				<div>
					${new Date(orderDetails.created).toLocaleDateString('en-us', {
						month: 'short',
						day: 'numeric',
						year: 'numeric'
					})}
				</div>
			</div>

			<div class="bill__row bill__section">
				${
					orderDetails.order_type === 'pickup'
						? `${store.name}<br />${store.address}`
						: getAddress()
				}
			</div>
			
			<div class="bill__section">
				<img
					class="bill__img"
					src="${biz.imageUrl}"
					onerror="this.style.display = 'none'"
				/>
				<div class="bill__txt-n bill__txt-b">${biz.name}</div>
				${
					biz.gstNo
						? `
								<div class="bill__row">
									<div>GST No.</div>
									<div>${biz.gstNo}</div>
								</div>
							`
						: ''
				}
				${
					biz.tinNo
						? `
								<div class="bill__row">
									<div>Tin No.</div>
									<div>${biz.tinNo}</div>
								</div>
							`
						: ''
				}
			</div>

			<div class="bill__section">
				<div class="bill__row">
					<div>Order ID:</div>
					<div>${orderDetails.id}</div>
				</div>

				${paymentRow}
				
				<div class="bill__row">
					<div>Channel:</div>
					<div>${channel}</div>
				</div>
				<div class="bill__row">
					<div>Channel ID:</div>
					<div>${extChannelId}</div>
				</div>
				<div class="bill__row">
					<div>Delivery time:</div>
					<div>${deliveryTime}</div>
				</div>
				<div class="bill__row">
					<div>Operator:</div>
					<div>${operator || ''}</div>
				</div>
			</div>
			
			<div class="bill__section">
				<div class="bill__row">
					<div>Cust. name:</div>
					<div>${customer.name}</div>
				</div>
				<div class="bill__row">
					<div>Cust. Phone:</div>
					<div>${customer.phone}</div>
				</div>
			</div>

			<div class="bill__section">
				${order.items.map(
					item => `
							<div>
								<div class="bill__row">
									<div>${item.title}</div>
									${
										item.options_to_add.length
											? `
													<div class="bill__item-options">
														${item.options_to_add.map(option => `<div>${option.title}</div>`)}
													</div>
												`
											: ''
									}
									<div>${item.quantity} x ${item.price}</div>
									<div>${item.total}</div>
								</div>
								${item.charges.map(
									charge =>
										`
											<div class="bill__item-extra">${charge.title} (${charge.rate}%): ${
											charge.value
										}</div>
										`
								)}
								${item.taxes.map(
									tax =>
										`<div class="bill__item-extra">${tax.title} (${
											tax.rate
										}%): ${tax.value}</div>`
								)}
							</div>
					`
				)}
			</div>
			
			<div class="bill__section">
				<div class="bill__row">
					<div>Sub-total</div>
					<div>${orderDetails.order_subtotal}</div>
				</div>

				${
					orderDetails.discount
						? `<div class="bill__row">
								<div>Discount</div>
								<div>${orderDetails.discount}</div>
							</div>`
						: ''
				}

				${
					orderDetails.coupon
						? `<div class="bill__row">
								<div>Coupon</div>
								<div>${orderDetails.coupon}</div>
							</div>`
						: ''
				}

				<div class="bill__row">
					<div>Taxes</div>
					<div>${orderDetails.total_taxes || 0}</div>
				</div>

				<div class="bill__row">
					<div>Charges</div>
					<div>${orderDetails.total_charges || 0}</div>
				</div>

				<div class="bill__row">
					<div>Order Total</div>
					<div>${biz.currCode} ${orderDetails.order_total}</div>
				</div>

				${
					walletCreditApplied
						? `
								<div class="bill__row">
									<div>Credit applied</div>
									<div>-${biz.currCode} ${orderDetails.order_total}</div>
								</div>
								<div class="bill__row">
									<div>Payable amount</div>
									<div>${biz.currCode} ${orderDetails.order_total -
								walletCreditApplied.amount}</div>
								</div>
							`
						: ''
				}
			</div>

			${instructionsRow}
			
			<div class="bill__lst">
				<div class="bill__txt-n">${store.name || ''}</div>
				<div class="bill__txt-n">${store.address || ''}</div>
				<div class="bill__txt-n">${store.phone || ''}</div>
			</div>

		</div>
	`;

	if (printKot && extChannelId) {
		const _id = `#order_slip_swiggy_barcode`;

		window.JsBarcode(_id, parseInt(orderDetails.id));
	}
}
