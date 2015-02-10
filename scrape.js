var jsdom = require('jsdom');
var sleep = require('sleep');
var fs = require('fs');
var request = require('request');

var startDate = process.argv[2] && process.argv[2].split('-');
var endDate = process.argv[3] && process.argv[3].split('-');
if (startDate && endDate) {
	console.log('Date range: ', startDate, endDate);
	if (startDate.length > 3 || endDate.length > 3) {
		throw new Error('Params are messed up...');
	}
	var startMonth = startDate[1] > 0 ? startDate[1] - 1 : 0; // JS 0-indexed date.
	var endMonth = endDate[1] > 0 ? endDate[1] - 1 : 0;
	startDate = new Date(startDate[0], startMonth, startDate[2])
	endDate = new Date(endDate[0], endMonth, endDate[2])
} else {
	startDate = new Date(2015, 0, 1);
	endDate = new Date(2050, 0 , 1);
}

var periodsPerYear = {}; // This stores all our data.

// Get all the days we want.

var daysOfYear = [];
for (var d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
    daysOfYear.push(new Date(d));
}

// For this site, looks like certain colors represent luck.
var colorToLuckMap = {
	'#FF0000': 1, // red is lucky
	'#0000FF': 0, // blue is neutral
	'#000000': -1 // black is bad luck
};

jsdom.env({
	url: 'http://www.chinesefortunecalendar.com/TDB/Luckyhours.asp',
	scripts: ['http://code.jquery.com/jquery.js'],
	done: function (errors, window) {
		var document = window.document;

		var getPeriodsInDay = function(year, month, day, callback) {
			request.post('http://www.chinesefortunecalendar.com/TDB/Luckyhours.asp', {
				SunYear: year,
				SunMonth: month,
				SunDay: day
			}, function(err, httpResponse, data) {
				// d is the raw string response of html data.
				// create a temporary node to work with the data.
				var rootNode = document.createElement('div');
				rootNode.innerHTML += data;
				var table = rootNode.querySelectorAll('table')[2];
				var rows = table.querySelectorAll('tr');
				// should have 4 columns per row, representing a 2-hour period each.
				var allPeriodsPerDay = [];
				Array.prototype.forEach.call(rows, function(row) {
					var columns = row.querySelectorAll('td');
					Array.prototype.forEach.call(columns, function(column) {
						var color = column.querySelector('font').getAttribute('color');
						allPeriodsPerDay.push(colorToLuckMap[color]);
					});
				});
				var key = [year, month, day].join('-');
				periodsPerYear[key] = allPeriodsPerDay;
				var output = key + ' = ' + allPeriodsPerDay.join(', ') + '\n';
				console.log(output);
				fs.appendFileSync('data.txt', output);
				callback();
			});
		};

		var getWaitPeriod = function() {
			return Math.floor(Math.random() * 3);
		};

		var date = daysOfYear.shift();

		var runProcess = function() {
			getPeriodsInDay(date.getFullYear(), date.getMonth() + 1, date.getDate(), function() {
				date = daysOfYear.shift();
				if (!date) {
					// all done here...
					console.log('All done!');
					return;
				}
				runProcess();
			});
		};
		runProcess();
	}
});
