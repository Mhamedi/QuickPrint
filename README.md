# QuickPrint
Electrorn app to handle printing request from browser and handle the print job silently.

## How to use:  
1) Install it in your system.  
2) Configure your printer in the app.  
3) Make request to your local client to issue print command.  

## How it works:  
Once you install the app, it runs a webserver on port `16253`. This web-server runs locally in your system and should be accessible at `localhost:16253`. 
This webserver creates the communication bridge between your browser (or any external platform) and the OS app. 
The webserver has following endpoints:  

1) `:16253/` - `GET` - gives you the current printer status.  
2) `:16253/printText` - `POST` - issue print request. Send content with the body.  

**NOTE:**  If you want to add more functionality, feel free to raise PR.

## Advanced usage  
Default port = 16253
Fallback ports (in order) = 16254, 16255
If the default port fails, the fallback ports are tried for availability one by one. If both ports are unavailable, a random port is assigned.



------
## Internal usage
### To check if satellite printer is set up and to verify if there is a faulty printer

Make a request to http://localhost:PRINTER_PORT/

The response returned by the satellite printer is

```
{
	satellitePrinter: true,
	faultyPrinterInfo: {
		faultyPrinter: {
			...printerData,
			mainPrinter: <boolean value that specifies whether the faultyPrinter is the main printer>,
			kitchenPrinter: <boolean value that specifies whether the faultyPrinter is the kitchen printer>,
		},
		errorMessage: <string that specifies the error message>
	}
}
```

If there are multiple faulty printers, only one is returned.

### Configuring printers
Open the installed application and select printers (main and kitchen)

### To print from an external application

Make a POST request to http://localhost:PRINTER_PORT/print with the following body

```
{
	biz: {
		name: <biz_name>,
		imageUrl: <biz_logo>,
		gstNo: <biz_GST_no.>,
		tinNo: <biz_TIN_no.>,
		currCode: <biz_currency_code>
	},
	operator: <operator_first_name>,
	authHeader: <auth_header>,
	orderId: <order_id>
}
```

## Building the app

To test the app,

```
npm run start
```

To build the app for windows,

```
npm run win
```

## File information

```
project
│   main.js - Contains the main process code for electron
│   requests.js - Contains functions used to make external requests
│   testPrintData.json - Contains the data used to generate a test bill
│   winPrinterErrCodes - Contains printer error codes
│   buildResources/\*\*/\* - Contains resources used to build the application
│
└───src
│   │   renderer.js - Contains the render function that prints the bill
│   │   index.(css│ js│ html) - files for the / route
│   │   print.(css│ js│ html) - files for the /print route
│
└───utils
    │   printUtils.js - Contains the function that finds the faulty printer

```
