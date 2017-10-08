var resp = {};
var ww = $(window).width();
if (ww <= 768){
	resp.width = ($("#viz").width() / 2);
	resp.height = window.innerHeight / 3 - $("#viz .viz-title").height() - Number($("#viz").css("padding-top").split("px")[0]);
} else {
	resp.width = ($("#viz").width() / 3);
	resp.height = window.innerHeight / 2 - $("#viz .viz-title").height() - Number($("#viz").css("padding-top").split("px")[0]);
}

$("body").append("<div class='tip'><div class='name'></div><div class='country-of-birth'></div><div class='year'></div><div class='for'></div></div>");
$(".tip").hide();

var colors = {"male": "#48a2d7", "female": "#e74c3c", "org": "#ccc"};
	padding = 0;

d3.queue()
		.defer(d3.csv, "data/all.csv")
		.await(ready);

function ready(error, data){
	if (error) throw error;

	data.forEach(function(d, i){ 
		d.id = i;
		return d;
	});

	var year_extent = d3.extent(data, function(d){ return +d.year; })
	var controls_data = [{name: "start_year", year: year_extent[0]}, {name: "end_year", year: year_extent[1]}];
	var bg_data = {"start_year": year_extent[0], "end_year": year_extent[1]};

	var controls_dim = 36;
	var controls_m = d3.marcon()
			.width($("#scroll .frame").width())
			.height(controls_dim * 2)
			.top(0)
			.bottom(controls_dim)
			.right(controls_dim / 2)
			.left(controls_dim / 2)
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

	// draw a rect between them
	controls_svg.append("rect")
			.attr("height", controls_dim / 2)
			.attr("width", controls_width)
			.attr("x", 0)
			.attr("y", controls_dim / 4)
			.attr("rx", 10)
			.attr("ry", 10)
							.style("fill", "#fff")
				.style("stroke", "rgb(170, 170, 170)")

			// .style("shape-rendering", "crispEdges");

	var controls_axis = d3.axisBottom(controls_x).tickFormat(function(d){ return d.toString().replace(",", "")})

	controls_svg.append("g")
		.attr("class", "controls-axis")
		.attr("transform", "translate(0," + (controls_dim - 2) + ")")
		.call(controls_axis)

	drawControls(controls_data);
			
	function drawControls(controls_data){

		var bg_data = [{"start_year": controls_data[0].year, "end_year": controls_data[1].year}];

		var controls_rect = controls_svg.selectAll(".control-rect")
				.data(controls_data, function(d){ return d.name; });
		
		var controls_text = controls_svg.selectAll(".control-text")
				.data(controls_data, function(d){ return d.name; });

		var controls_bg = controls_svg.selectAll(".control-bg")
				.data(bg_data, function(d, i){ return i; });

		// update
		controls_bg
				.attr("width", function(d){ return controls_x(d.end_year) - controls_x(d.start_year); })
				.attr("x", function(d){ return controls_x(d.start_year); })

		controls_rect
				.attr("cx", function(d, i){ return controls_x(d.year); })

		controls_text
				.attr("x", function(d, i){ return controls_x(d.year); })
				.text(function(d){ return d.year; });

		// enter
		controls_bg.enter().append("rect")
				.attr("class", "control-bg")
				.attr("height", function(d){ return controls_dim / 2; })
				.attr("width", function(d){ return controls_x(d.end_year) - controls_x(d.start_year); })
				.attr("x", function(d){ return controls_x(d.start_year); })
				.attr("y", controls_dim / 4)
				.style("fill", "#eee")
				.style("stroke", "#888")
				// .style("shape-rendering", "crispEdges");

		controls_rect.enter().append("circle")
				.attr("class", "control-rect")
				.attr("r", controls_dim / 2)
				.attr("cx", function(d, i){ return controls_x(d.year); })
				.attr("cy", controls_dim / 2);

		controls_text.enter().append("text")
				.attr("class", "control-text")
				.attr("x", function(d, i){ return controls_x(d.year); })
				.attr("y", controls_dim / 2)
				.attr("dy", 4)
				.text(function(d){ return d.year; });
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
			.bottom(60);

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
					//start_year, end_year, type_data, svg, width, height, x, y
						updateAll(steps[frame_index][0], steps[frame_index][1], type_data, ts.svg, ts.width, ts.height, ts.x, ts.y)
					} else {
						if (frame_index - 1 != -1){
							updateAll(steps[frame_index - 1][0], steps[frame_index - 1][1], type_data, ts.svg, ts.width, ts.height, ts.x, ts.y)
						}
					}
				});

				// reset the inputs
				$(".end-year").attr("min", 1901).attr("max", 2017).val(2017)
				$(".start-year").attr("min", 1901).attr("max", 2017).val(1901)

			},
			offset: $(window).height() / 1.2
		});

	});


	d3.selectAll(".control-rect").call(d3.drag().on("drag", updateControls));
	d3.selectAll(".control-text").call(d3.drag().on("drag", updateControls));

	function updateControls(d, i){
		d3.select(this).moveToFront();
		d3.selectAll(".control-text").moveToFront();
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
			updateAll(controls_data[0].year, controls_data[1].year, type_data, ts.svg, ts.width, ts.height, ts.x, ts.y);

		});
	}

	function updateAll(start_year, end_year, type_data, svg, width, height, x, y){

		updateTitle(start_year, end_year)
		draw(filterData(start_year, end_year, type_data), calcRowsFromYears(start_year, end_year), svg, width, height, x, y);
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
		return type_data.filter(function(row){
			return +row.year >= start_year && +row.year <= end_year;
		});
	}

	function draw(data, rows, svg, width, height, x, y){

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
				.attr("transform", calcLegendCircleTransform)

		legend_text.enter().append("text")
				.attr("class", function(d){ return "legend-text " + d.gender; })
				.attr("x", function(d){ return legend_x(d.gender); })
				.attr("y", 0)
				.attr("dy", calcLegendTextDy)
				.attr("text-anchor", "middle")
				.style("font-size", calcLegendTextSize)
				.style("fill", "#fff")
				.attr("transform", calcLegendTextTransform)
				.text(function(d){ return d.count });

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

		circle.on("mouseover", tipon).on("mouseout", tipoff)
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
				.on("mouseover", tipon).on("mouseout", tipoff)
			.transition()
				.attr("r", d3.min([x.bandwidth(), y.bandwidth()]) / 2)
				

		function tipoff(d){
			console.log(d);
			d3.selectAll(".winner").classed("selected", false);
			$(".tip").hide();
		}

		function tipon(d){

			$(".tip").show();

			d3.select(this).classed("selected", true);
			
			// populate the tip
			$(".tip .name").html(d.name);
			$(".tip .country-of-birth").html(d.country);
			$(".tip .year").html(d.year);
			$(".tip .for").html(jz.str.toSentenceCase(d.description) + ".");

			// position
			var x_pos = x(d.row);
			var y_pos = y(d.column);
			var tip_height = $(".tip").height();
			var tip_width = $(".tip").width();
			var tip_padding_h = getN($(".tip").css("padding-left")) + getN($(".tip").css("padding-right"));
			var tip_padding_v = getN($(".tip").css("padding-top")) + getN($(".tip").css("padding-bottom"));
			var viz_top = $(".type-wrapper ." + d.type).offset().top;
			var viz_left = $(".type-wrapper ." + d.type).offset().left;
			var circle_radius = (d3.min([x.bandwidth(), y.bandwidth()]) / 2);

			var viz_position = $("#viz").css("position")

			function getN(padding){
				return Number(padding.split("px")[0]);
			}

			var row_max = d3.max(data, function(d){ return d.row; })

			// Don't know why this won't work for all sizes
			var offset = row_max == 2 ? 20 :
				row_max == 3 ? 35 :
				row_max == 4 ? 45 : 
				row_max == 5 ? 50 :
				row_max == 6 ? 63 :
				row_max == 7 ? 67 :
				row_max == 8 ? 70 :
				row_max == 9 ? 73 :
				row_max == 10 ? 76 :
				ww / 18;
			
			var tip_left = x_pos + viz_left - (tip_width / 2) - offset;
			
			tip_left = tip_left < 0 ? 0 : 
				tip_left + tip_width > ww ? ww - tip_width :
				tip_left;

			var tip_top = y_pos + viz_top - tip_height + getN($(".navbar").css("height"));

			$(".tip").css({
				left: tip_left,
				top: tip_top
			});

		}

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


	// create the waypoints for fixing the viz
	// this is for above the viz
	new Waypoint({
		element: $("#viz"),
		handler: function(direction){
			if (direction == "down"){
				$("#viz").removeClass("above");
				$("#scroll").removeClass("above");	
				$(".footer").show();
			} else {
				$("#viz").addClass("above");
				$("#scroll").addClass("above");	
				$(".footer").hide();
			}
		},
		offset: 40
	});

	// and for below
	new Waypoint({
		element: $("#section-2"),
		handler: function(direction){
			if (direction == "down"){
				$("#section-2").removeClass("above");
				$("#viz").css({
					position: "absolute",
					top: $("#section-2").offset().top - $(window).height()
				});
			} else {
				$("#section-2").addClass("above");
				$("#viz").css({
					position: "fixed",
					top: 40
				})
			}
		},
		offset: $(window).height()
	});

}




// the background image
var f = true;
$(".title-background").flip();
d3.interval(function(){
	$(".title-background .back img").show();
	$(".title-background").flip(f);
	if (f == true) {
		f = false;
	} else {
		f = true
	};
	// var curr = $(".title-background").css("background-image");
	// if (curr.indexOf("nobel-prize.png") != -1){
	// 	$(".title-background").css("background-image", "url('img/nobel-prize-blue.png')");
	// } else {
	// 	$(".title-background").css("background-image", "url('img/nobel-prize.png')");
	// }
	$(".title-background").flip();
}, 3000);
