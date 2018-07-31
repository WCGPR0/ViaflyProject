var express = require('express');
var fs = require('fs');
var parse = require('csv-parse');
var async = require('async');
var Promise = require('promise');
var app = express();

var inputFile='data.csv'; //< The input file to be read, defaulting to data.csv
var output = []; //< The output variable which stores the entire data

/** 
 * Reads in the .csv file during start of the application, and stores them into variable output.
 * Uses promise callbacks to handle asychronized file reading
 */
var readData = function(line) {
   output.push(line);
   return Promise.resolve(true);
}
var parser = parse({delimiter: ','}, function (err, data) {
	  async.eachSeries(data, function (line, callback) {
			       readData(line).then(function() {	callback();	});
	  }) 
})
var stream = fs.createReadStream(inputFile).pipe(parser);
const IN_STOCK_VALUE = 1;

/** 
 * Main handler for default root path. Outputs the data stream into a bootstrapped formatted table.
 */
app.get('/', function (req, res) {	
	res.write(fs.readFileSync("public/template.html"));	
    res.write("<table class='table'> <thead> <tr>");
// HEADER OF TABLE
   output[0].forEach( function (val, i) {
//!-- In exchange for a more dynamic (headers based off .csv file), backend has to handle this part. Ideally, we would put this in a static file if possible
   		// Additional html/css injections
			switch (val) {
			case "Item":
				res.write("<th><div class='container' style='max-width: 850px'><div class='row'> <div class='col-md-3'> <a href='#' onclick='sort(" + i + ")'>" + String(val) + "</a></div>");
				res.write(`
							        <div class='col-md-3'>
							            <div id='custom-search-input'>
							                <div class='input-group col-md-12'>
							                    <input type='text' class='form-control input-lg' placeholder='Search Box!' id = 'searchBox' />
							                    <span class='input-group-btn'>
							                        <button class='btn btn-info btn-lg' type='button'>
							                            <i class='glyphicon glyphicon-search'></i>
							                        </button>
							                    </span>
							                </div>
							            </div>
							        </div>
							     </div>
							</div>`);
				break;
			case "Qty.":
	    		res.write("<th> <a href='#' onclick='sort(" + i + ")'>" + String(val) + `</a>
	    		<div class="dropdown">
  <button class="btn btn-primary dropdown-toggle" type="button" data-toggle="dropdown">
  <span class="caret"></span></button>
  <ul class="dropdown-menu">
  <li><label><input type="checkbox" id="in-stock">Show in stock</label></li></ul></div>
	    		</th>`);
	    		break;
	    	case "Category":
	    		res.write("<th> <a href='#' onclick='sort(" + i + ")'>" + String(val) + `</a>
	    		<div class="dropdown">
  <button class="btn btn-primary dropdown-toggle" type="button" data-toggle="dropdown">
  <span class="caret"></span></button>
  <ul class="dropdown-menu"> `);
	    		var category = output.map(function(a,b) { return a[5]; });
	    		category = category.slice(1).filter(function(item, pos, self) {
    				return self.indexOf(item) == pos;
				});
				category.forEach( function (a) { res.write('<li><label><input type="checkbox" class="category-input" value="' + a.toString() + '" />' + a.toString() + "</label></li>") });
	    		res.write("</ul></div></th>");
	    		break;
			default:
				res.write("<th> <a href='#' onclick='sort(" + i + ")'>" + String(val) + "</a>");
	    		res.write("</th>");
			}
   });
   res.write("</tr></thead><br />");

// DATA OF TABLE
	for (var i = 1; i < output.length; i++) {
	  res.write("<tr>");
	  output[i].forEach( function (val) { res.write("<td>" + String(val) + "</td>"); });
	  }
	res.write(fs.readFileSync("public/footer.html"));	
    res.end();
});


/** 
 * Main handler for sorting by System ID, UPC, Item, Quantity, Price, and Category. Works with Ajax in the client side to refresh data without reloading the page.
 * Path is /sortBy/0 for System ID, /sortBy/1 for UPC, /sortBy/2 for Item, /sortBy/3 for Quantity, /sortBy/4 for Price, /sortBy/5 for Category
 */
app.get('/sortBy/:tableID', function (req, res) {
   var tableID = req.params.tableID; 
   if (tableID > 5 || tableID < 0) res.sendStatus(500); //Logic error, invalid path. Must be a user error
   else {
	  var _output = output.slice(1);
	  _output.sort( function(a, b) {
		 if (a[tableID] === b[tableID]) {
			 return 0;
		 }
		 else return (a[tableID] < b[tableID]) ? -1 : 1;
	  }); 
	// Sends out a formatted raw HTML output
	for (var i = 0; i < _output.length; i++) {
	  res.write("<tr>");
	  _output[i].forEach( function (val) { res.write("<td>" + String(val) + "</td>"); });
	  res.write("</tr>");
	  }
	res.end();
   }
});


/** 
 * Main handler for searching items. Works with Ajax in the client side to refresh data without reloading the page.
 * Path is /search/ITEMPARTIAL
 */
app.get('/search/:itemPartial', function (req, res) {
	var _output = output.slice(1);
	var itemPartial = req.params.itemPartial;
	_output = _output.filter( function(a) {
		 return a[2].includes(itemPartial);
	});
	// Sends out a formatted raw HTML output
	for (var i = 0; i < _output.length; i++) {
	  res.write("<tr>");
	  _output[i].forEach( function (val) { res.write("<td>" + String(val) + "</td>"); });
	  res.write("</tr>");
	  }
	  res.end();
});

/** 
 * Main handler for filtering quantity above 0. Works with Ajax in the client side to refresh data without reloading the page.
 * Path is /instock
 */
app.get('/instock', function (req, res) {
	var _output = output.slice(1);
	_output = _output.filter( function(a) {
		 return a[3] > IN_STOCK_VALUE;
	});
	// Sends out a formatted raw HTML output
	for (var i = 0; i < _output.length; i++) {
	  res.write("<tr>");
	  _output[i].forEach( function (val) { res.write("<td>" + String(val) + "</td>"); });
	  res.write("</tr>");
	  }
	  res.end();
});

/** 
 * Main handler for filtering categories. Works with Ajax in the client side to refresh data without reloading the page, and recieves the data from the client side using a GET request.
 * Path is /filter
 */
app.get('/filter', function (req, res) {
	var _output = output.slice(1);
	var categories = new Array();
	categories = req.query.categories;
	_output = _output.filter( function(a) {
		 return categories.indexOf(a[5]) > -1;
	});
	// Sends out a formatted raw HTML output
	for (var i = 0; i < _output.length; i++) {
	  res.write("<tr>");
	  _output[i].forEach( function (val) { res.write("<td>" + String(val) + "</td>"); });
	  	res.write("</tr>");
	 }
	 res.end();
});

/**
 * For Heroku
 */

app.set('port', (process.env.PORT || 5000));

/**
 * Application listens on the process.env.PORT (for c9 IDE) and 3000 by default
 */
app.listen(app.get('port') || process.env.PORT || 3000, function () {
	  console.log('Viafly project launched!');
});
