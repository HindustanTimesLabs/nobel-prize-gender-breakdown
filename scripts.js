var resp = {};
var ww = $(window).width();
if (ww <= 768){
	resp.width = ($("#viz").width() / 2);
	resp.height = window.innerHeight / 3 - $("#viz .viz-title").height() - Number($("#viz").css("padding-top").split("px")[0]);
} else {
	resp.width = ($("#viz").width() / 3);
	resp.height = window.innerHeight / 2 - $("#viz .viz-title").height() - Number($("#viz").css("padding-top").split("px")[0]);
}

var colors = {"male": "#48a2d7", "female": "#e74c3c", "org": "#ccc"};
	padding = 0;

d3.queue()
		.defer(d3.csv, "all.csv")
		.await(ready);

function ready(error, data){
	if (error) throw error;

	data.forEach(function(d, i){ 
		d.id = i;
		return d;
	});

	var year_extent = d3.extent(data, function(d){ return +d.year; })
	var controls_data = [{name: "start_year", year: year_extent[0]}, {name: "end_year", year: year_extent[1]}];
	
	var controls_dim = 20;
	var controls_m = d3.marcon()
			.width($("#scroll .frame").width())
			.height(controls_dim)
			.top(0)
			.bottom(0)
			.right(20)
			.left(0)
			.element("#playground-controls");

	controls_m.render();

	var controls_width = controls_m.innerWidth(), controls_height = controls_m.innerHeight(), controls_svg = controls_m.svg();
		
	var controls_domain = [];
	for (var year = year_extent[0]; year <= year_extent[1]; year++){
		controls_domain.push(year);
	}

	var controls_x = d3.scaleLinear()
			.range([0, controls_width])
			.domain(year_extent);

	drawControls(controls_data);
			
	function drawControls(controls_data){
		var controls_rect = controls_svg.selectAll(".control-rect")
				.data(controls_data, function(d){ return d.name; })
	
		controls_rect
				.attr("x", function(d, i){ return controls_x(d.year); });

		controls_rect.enter().append("rect")
				.attr("class", "control-rect")
				.attr("width", controls_dim)
				.attr("height", controls_dim)
				.attr("x", function(d, i){ return controls_x(d.year); })
				.attr("y", 0);
	}

	var svg_obj = {};

	var types = _.chain(data).pluck("type").uniq().value().sort();

	var max_rows = 0,
		steps = [
			[2017, 2017],
			[2016, 2016],
			[2015, 2015],
			[2000, 2017],
			[1901, 2017]
		],
		title_offset = 45;

	types.forEach(function(type, type_index){

		// first append wrapper divs
		$("#viz").append("<div class='type-wrapper " + type + "'></div>");

		// get data associated with this type
		var type_data = _.where(data, {type: type});

		var obj = {};

		var m = d3.marcon()
			.element(".type-wrapper." + type)
			.width(resp.width)
			.height(resp.height)
			.left(10)
			.right(10)
			.top(60)
			.bottom(30);

		m.render();

		var width = m.innerWidth(), height = m.innerHeight(), svg = m.svg();

		var x = d3.scaleBand()
				.range([0, width])
				.padding(padding);

		var y = d3.scaleBand()
				.range([0, height])
				.padding(padding);

		svg_obj[type] = {
			width: width,
			height: height,
			svg: svg,
			x: x,
			y: y
		}

		// the title
		svg.append("text")
				.attr("class", "type-title " + type)
				.attr("x", width / 2)
				.attr("y", -title_offset)
				.text(jz.str.toStartCase(type));

	}); // end types loop

	// make the waypoints
	$(".frame").each(function(frame_index, frame){

		new Waypoint({
			element: $(this),
			handler: function(direction){

				types.forEach(function(type){
					var type_data = _.where(data, {type: type});
					var ts = svg_obj[type];
					if (direction == "down"){
					//start_year, end_year, type_data, svg, width, height, type, x, y
						updateAll(steps[frame_index][0], steps[frame_index][1], type_data, ts.svg, ts.width, ts.height, type, ts.x, ts.y)
					} else {
						updateAll(steps[frame_index - 1][0], steps[frame_index - 1][1], type_data, ts.svg, ts.width, ts.height, type, ts.x, ts.y)
					}
				});


				

				// reset the inputs
				$(".end-year").attr("min", 1901).attr("max", 2017).val(2017)
				$(".start-year").attr("min", 1901).attr("max", 2017).val(1901)

			},
			offset: $(window).height() / 2
		});

		

		

	});


	d3.selectAll(".control-rect").call(d3.drag().on("drag", function(d, i){
		var coordinates = [0, 0];
		coordinates = d3.mouse(this);
		var x = coordinates[0];
		var name = d.name;

		var yr = controls_x.invert(x);
		yr = yr < year_extent[0] ? year_extent[0] :
			yr > year_extent[1] ? year_extent[1] :
			yr;
		yr = Math.round(yr);

		//update the controls data
		if (name == "start_year") {
			if (yr >= controls_data[1].year) yr = controls_data[1].year;
			controls_data[0].year = yr;
		} else {
			if (yr <= controls_data[0].year) yr = controls_data[0].year;
			controls_data[1].year = yr;
		}
		
		types.forEach(function(type){
			var type_data = _.where(data, {type: type});
			var ts = svg_obj[type];

			drawControls(controls_data);
			updateAll(controls_data[0].year, controls_data[1].year, type_data, ts.svg, ts.width, ts.height, type, ts.x, ts.y);

		});
		
	}));

	function updateAll(start_year, end_year, type_data, svg, width, height, type, x, y){

		updateTitle(start_year, end_year)
		draw(filterData(start_year, end_year, type_data), calcRowsFromYears(start_year, end_year), svg, width, height, type, x, y);
	}

	function updateTitle(start_year, end_year){
		var x = start_year == end_year ? start_year : start_year + " &mdash; " + end_year;
		$(".viz-title .year-range").html(x);
	}

	function calcRows(n){
		return Math.ceil(Math.sqrt(n));
	}

	function calcRowsFromYears(start_year, end_year){
		return calcRows(d3.max(types.map(function(type){
			return data.filter(function(row){
				return row.type == type && row.year >= start_year && row.year <= end_year;
			}).length;	
		})));
	}

	function filterData(start_year, end_year, type_data){
		var x = type_data.filter(function(row){
			return +row.year >= start_year && +row.year <= end_year;
		});
		return x;
	}

	function draw(data, rows, svg, width, height, type, x, y){

		if (!rows) var rows = calcRows(data.length);

		// update year range
		// legend
		var genders = _.chain(data).pluck("gender").uniq().value().sort();

		var legend_circle_radius = 25;

		var legend_width = legend_circle_radius * genders.length;

		var legend_x = d3.scaleBand()
				.rangeRound([0, legend_width])
				.domain(genders)
				.padding(.2)

		var legend_circle = svg.selectAll(".legend-circle")
				.data(genders, function(d){ return d; });

		var legend_text = svg.selectAll(".legend-text")
				.data(genders.map(function(d){ 
					return {
						gender: d,
						count: _.where(data, {gender: d}).length
					}; 
				}), function(d){ return d.gender; });

		legend_circle.exit()
			.transition()
				.attr("r", 0)
				.remove();

		legend_text.exit()
			.transition()
				.remove();

		legend_circle
			.transition()
				.attr("cx", function(d){ return legend_x(d); })
				.attr("cy", 0)
				.attr("r", legend_x.bandwidth() / 2)
				.attr("transform", calcLegendCircleTransform);

		legend_text
			.transition()
				.attr("x", function(d){ return legend_x(d.gender); })
				.attr("y", 0)
				.attr("transform", calcLegendTextTransform)
				.style("font-size", calcLegendTextSize)
				.attr("dy", calcLegendTextDy)
				.text(function(d){ return d.count })

		legend_circle.enter().append("circle")
				.attr("class", "legend-circle")
				.attr("cx", function(d){ return legend_x(d); })
				.attr("cy", 0)
				.attr("r", legend_x.bandwidth() / 2)
				.attr("fill", function(d){ return colors[d]; })
				.attr("transform", calcLegendCircleTransform);

		legend_text.enter().append("text")
				.attr("class", function(d){ return "legend-text " + d.gender; })
				.attr("x", function(d){ return legend_x(d.gender); })
				.attr("y", 0)
				.attr("dy", calcLegendTextDy)
				.attr("text-anchor", "middle")
				.style("font-size", calcLegendTextSize)
				.style("fill", "#fff")
				.attr("transform", calcLegendTextTransform)
				.text(function(d){ return d.count })	
				
		function calcLegendCircleTransform(){
			return "translate(" + (((width + 20) / 2) - (legend_width / 2)) + ", " + (-title_offset + 16) + ")"
			// return "translate(" + (d3.select(".type-title." + type).node().getBBox().width + 16)  + ", " + (-title_offset - (legend_x.bandwidth() / 2)) + ")"
		}
		function calcLegendTextTransform(){
			return "translate(" + (((width + 20) / 2) - (legend_width / 2)) + ", " + (-title_offset + 16) + ")"
			// return "translate(" + calcLegendTextLeft() + ", " + (-title_offset - (legend_x.bandwidth() / 2)) + ")";
		}
		function calcLegendTextLeft(){
			return (d3.select(".type-title." + type).node().getBBox().width + 16);
		}
		function calcLegendTextSize(d){
			return d.count > 99 ? ".5em" : ".7em"; 
		}
		function calcLegendTextDy(d){
			return d.count > 99 ? 3 : 4;
		}

		// update the scale domains
		var padding = rows < 5 ? .03 : .1;
		var x_domain = [], y_domain = [];
		for (var i = 1; i <= rows; i++){
			x_domain.push(i);
			y_domain.push(i);
		}

		x.domain(x_domain).padding(padding);
		y.domain(y_domain).padding(padding);

		var circle = svg.selectAll(".winner")
				.data(makeGrid(data, rows), function(d){ return d.id; });

		circle.exit()
			.transition()
				.attr("r", 0)
				.remove()

		circle
			.transition()
				.attr("cx", function(d){ return x(d.row) + x.bandwidth() / 2; })
				.attr("cy", function(d){ return y(d.column) + y.bandwidth() / 2; })
				.attr("r", d3.min([x.bandwidth(), y.bandwidth()]) / 2)

		circle.enter().append("circle")
				.attr("class", "winner")
				.attr("cx", function(d){ return x(d.row) + x.bandwidth() / 2; })
				.attr("cy", function(d){ return y(d.column) + y.bandwidth() / 2; })
				.style("fill", function(d){ return colors[d.gender]; })
				.attr("r", 0)
			.transition()
				.attr("r", d3.min([x.bandwidth(), y.bandwidth()]) / 2)

		function makeGrid(data, rows){

			// an out array
			var out = [];

			// first, figure out what row each one is
			data.forEach(function(d, i){
				d.column = Math.ceil((i + 1) / rows);
				return d;
			});

			// start with 1, the first row
			for (var row = 1; row <= rows; row++){
				// match the data in this row
				var row_data = data.filter(function(d){ return d.column == row; });
				row_data.forEach(function(d, i){
					d.row = i + 1;
					out.push(d);
				});
			}

			return out;

		}

	} // end draw


}




// var dim = d3.min([window.innerWidth, window.innerHeight]);

// var width = dim, height = dim;

// var svg = d3.select("body").append("svg")
// 	.attr("width", width)
// 	.attr("height", height);

// var nodes_count = 9,
// padding = .25;



// function generateData(n){
// var arr = [];
// for (i = 0; i < n; i++){
// 	arr.push({
// 		id: i,
// 		color: i % (jz.num.randBetween(1, 3)) == 1 ? "tomato" : "steelblue"
// 	});
// }
// return arr;
// }

// draw(generateData(nodes_count));

// d3.interval(function(){
// draw(generateData(jz.num.randBetween(4, 50)))
// }, 500);

// function draw(data){

// 	var rows = calcRows(data.length);

// 	// update the scale domains
// 	var x_domain = [], y_domain = [];
// 	for (var i = 1; i <= rows; i++){
// 		x_domain.push(i);
// 		y_domain.push(i);
// 	}
// 	x.domain(x_domain);
// 	y.domain(y_domain);

// 	var square = svg.selectAll("rect")
// 			.data(makeGrid(data, rows), function(d){ return d.id; });

// 	square.exit()
// 		.transition()
// 			.style("opacity", 1e-6)
// 			.remove();

// 	square
// 		.transition()
// 			.attr("x", function(d){ return x(d.row); })
// 			.attr("y", function(d){ return y(d.column); })
// 			.attr("width", x.bandwidth())
// 			.attr("height", y.bandwidth())
// 			.style("fill", function(d){ return colors[d.gender]; });

// 	square.enter().append("rect")
// 			.attr("x", function(d){ return x(d.row); })
// 			.attr("y", function(d){ return y(d.column); })
// 			.attr("width", x.bandwidth())
// 			.attr("height", y.bandwidth())
// 			.style("fill", function(d){ return colors[d.gender]; })
// 			.style("opacity", 1e-6)
// 		.transition()
// 			.style("opacity", 1);

// 	function makeGrid(data, rows){

// 		// an out array
// 		var out = [];

// 		// first, figure out what row each one is
// 		data.forEach(function(d, i){
// 			d.column = Math.ceil((i + 1) / rows);
// 			return d;
// 		});

// 		// start with 1, the first row
// 		for (var row = 1; row <= rows; row++){
// 			// match the data in this row
// 			var row_data = data.filter(function(d){ return d.column == row; });
// 			row_data.forEach(function(d, i){
// 				d.row = i + 1;
// 				out.push(d);
// 			});
// 		}

// 		return out;

// 	}

// 	function calcRows(n){
// 		return Math.ceil(Math.sqrt(n));
// 	}

// }

