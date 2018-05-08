//////////////////////////////////////////////////
////////Global Variables and formatters/////////// 
/////////////////////////////////////////////////
var widthA = window.innerWidth
var heightA = window.innerHeight
var marginA = { top: 40, right: 40, bottom: 40, left: 40 }

var divA = d3.selectAll('.divA')
    .attr("width", widthA)
    .classed("svg-containerA", true)

var svgA = divA.append("svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr('width', widthA)
    .classed("svgA", true)
    .attr("height", heightA)

var monthAvgArr = []
var testMaxOpening = [];
var textSize = 12;

d3.selectAll('.colorCircles')
    .style('fill', 'red')
//This number formatter changes my ints back to US currency
var intToMoneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
});


//Converts object values into an array
function returnOrdArray (returnArray, target){
        var array = [];
        for (var i = 0; i < returnArray.length; i++) {
            array.push (returnArray[i][target])
        }
        return array
        
}

var colorScale = d3.scaleOrdinal(d3.schemeSet1)
var colorScaleLegend = [];

//This is the initial time parser that changes my entire dataset to d3 time
var parseTime = d3.timeParse("%m/%d/%y")

//First Axis
var x = d3.scaleTime()
        .rangeRound([60, widthA-100]);
        
//This is for my second axis
var x3 = d3.scaleTime()
    .rangeRound([50, widthA-50]);

var circleLegendScale = d3.scaleLinear()
                    .range(1)
//////////////////////////////////////////////////////
////////Create chart A in the render function (data loads and function is called later)///////
///////////////////////////////////////////////////

function renderA(data) {
    
 
   var g = svgA.append("g")
    .attr("id", "ga")
    .attr("transform", "translate("+ 0 + "," + -40 + ")")
    
//////////////////////////////////////////////////////
////////Pre-calculations for visualization///////
///////////////////////////////////////////////////

//get average of each month with years combined
    var monthlyOpeningAverages = d3.nest()
    .key(function(d) { return d.month; })
    .rollup(function(v) { 
        return d3.sum(v, function(d) { return d['Opening Gross'];
        //change to d3.mean for average per film
        });
    })
    .entries(data);
    
//sort average by month
    monthlyOpeningAverages.sort(function (a, b) {
    return a.key - b.key;
    });
    
//Turn Averages into $
    monthlyOpeningAverages.forEach(function(d, i){
        monthlyOpeningAverages[i].value = intToMoneyFormatter.format (Math.round(monthlyOpeningAverages[i].value))
    })
    

//Create scale for circle size
    var sizeScale = d3.scaleLinear()
        .domain([0, d3.max(testMaxOpening)])
        .range([2, 30]);


//create x domain based on a variable I created in my object, averaged year: It removes the day and year values in order to do a month-level analysis
    x.domain(d3.extent(data, function(d) { return d.averagedYear}));

// monthAvgArr.openingAverage
    var xAvg = d3.scalePoint()
          .domain(returnOrdArray(monthlyOpeningAverages, "value"))
          .range([60, widthA-100]);;
    
//Start the clusterforce simulation 
   var simulation = d3.forceSimulation(data)
        .force("x", d3.forceX(function(d) { return x(d.averagedYear); }).strength(5))
        .force("y", d3.forceY(heightA / 2.7))
//force collide treats nodes as circles with a radius to prevent them from colliding: this is set the same as my circle's "r"
        .force("collide", d3.forceCollide(function(d) { return sizeScale(d['Opening Gross']) }))
        .stop()

//The cluster force simulation isn't a moving simulation for this projct: It manually ticks through the simulation using a for loop.
    for (var i = 0; i < data.length; ++i) simulation.tick();

    var axis1 = g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + heightA/1.6+ ")")
// call axis and format tics to month
        .call(d3.axisBottom(x).ticks(12).tickFormat(d3.timeFormat("%b")))
        .style("font-size", "0")

     var axis2 = g.append("g")
        .data(monthlyOpeningAverages)
        .attr("class", "axis axis--x ")
        .attr("transform", "translate(0," + heightA/1.5 + ")")
// call axis and format tics to month
        .call(d3.axisBottom(xAvg).ticks(12))
        .style("font-size", "0")

        
         d3.selectAll(".axis")
         .transition()
         .delay(200)
         .duration(200)
         .style("font-size", textSize)

    var cell = g.append("g")
        .attr("class", "cells")
        .selectAll("g")
//Add voroni overlay to improve interactivity: makes interacting with tiny circles way easier
        .data(d3.voronoi()
        .extent([[-marginA.left, -marginA.top], [widthA + marginA.right, heightA + marginA.top]])
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .polygons(data)).enter().append("g")
//I had trouble targeting my data with tooltips through the voroni overlay, so I ended up holding my title data in the element's ID and parsing
//it out: This is a workaround that I'd like to fix.
        .attr("id", function(d) {
                return "<span class = 'titleStyle'>" + d.data.Title.replace(/ /g, "_") + "</span>" +  "*" 
                + d.data.Genre.replace(/ /g, "_").replace("/", "&") + "*"
                + "Opening: " + intToMoneyFormatter.format (d.data['Opening Gross']) + "*"
                + "Total: " + intToMoneyFormatter.format (d.data['Total Gross']) + "*"
        });

            
    var circle = cell.append("circle")
        .attr("class", "circle")
        .attr("cx", function(d) { if (d) { return d.data.x }; })
        .attr("cy", function(d) { if (d) { return d.data.y }; })
        .transition()
        .delay(200)
        .duration(200)
        .attr("r", function(d) {return sizeScale(d.data['Opening Gross']) })
        .attr('fill', function(d){return colorScale(d.data.simpleGenre) })
 //save colorScale in an object
                  
 
//joining voroni 
   var path = cell.append("path")
        .attr("d", function(d) { if (d) { return "M" + d.join("L") + "Z"; } })
// This is a great way to attach titles except they take about 3 seconds to load
// cell.append("title")
// .text(function(d) { return d.data.Title + d.data.Genre + "\n" + formatter.format(d.data['Opening Gross']); });
        
    
    cell.on("mouseover", function(d){
            d3.selectAll('.tooltip')
            .attr('id','tooltip')
//Target movie id to get data from anywhere in code
            var movieTitle = this.id
            
            d3.selectAll('#tooltip')
                .html(function(d){
                    return(movieTitle.replace(/_/g, " ").replace(/\*/g, "</br>"))
                 })
                .style("opacity", 1)
                .style("left", (d3.event.pageX + -70) + "px")		
                .style("top", (d3.event.pageY + - 150) + "px");
     })
    
    
        .on("mouseout", function(d){
            d3.selectAll('.tooltip')
            .style("opacity",0)
            .html("")
        });
        
        
        
    //Quick and messy legend#2: This couldn't match my categories colors
    //and fit into the render function
    
    var legendColorCirclesNum = [1,2,3,4,5,6,7,8,9]
    var legendColorCirclesText = ["Animation", 'Fantasy', 'Sci-Fi', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Romance', 'Action']
    
    var legendSvg = d3.selectAll('.legendSvg')
        
    var g2 = d3.selectAll('.legendSvg')
             .append('g')
             .attr('class', 'g2')
             .attr("transform", "translate("+ widthA/15 + "," + 90 + ")");

    
    var legendColorCircles = g2.selectAll('.legendColorCircles')
                              .data(legendColorCirclesNum)
                              .enter()
                              .append('circle')
                              

    var circleAttributes =  legendColorCircles
                              .data(data)
                              .attr('r', '5')
                              .attr('cy', function(d, i){ return i * 12 + 30;})
                              .attr('fill', function(d,i){return colorScale(i)})
                              .text(function(d){return legendColorCirclesText})

                              
     var textColorCircles = g2.selectAll('.textColorCircles')
                                  .data(legendColorCirclesText)
                                  .enter()
                                  .append('text')
                                  .text(function(d){return d})
                                  .attr('y', function(d, i){ return i * 12 + 33;})
                                  .attr('x', 8)
                                  .attr('class', 'legendG')
                                  .style('font-size', '9')


}


////////////////////////////////////////////////////////////////////////////////////////////////////
/////Second Chart, repeats the code for the first except value changes
/////Fix this in the future by restarting simulation instead of re-rendering
//////////////////////////////////////////////////////////////////////////////////////////////////



function renderB(data, i) {
    
    var g = svgA.append("g")
    .attr("id", "ga")
    .attr("transform", "translate("+ 0 + "," + -20 + ")");


    var maxTest = testMaxOpening.reduce(function(a, b) {
        return Math.max(a, b);
    });


    var myScale = d3.scaleLinear()
        .domain([0, maxTest])
        .range([2, 30]);


    x.domain(d3.extent(data, function(d) { return d['Open Date']}));
    
    x3.domain([new Date(2014, 0, 1),  new Date(2016, 12, 0)]);

    var simulation = d3.forceSimulation(data)
        .force("x", d3.forceX(function(d) { return x(d['Open Date']); }).strength(5))
        .force("y", d3.forceY(heightA / 3))
        .force("collide", d3.forceCollide(function(d) { return myScale(d['Opening Gross']) }))
        .stop()


    for (var i = 0; i < data.length; ++i) simulation.tick();

   var axis1 = g.append("g")
        .attr("class", "axis axis--x")
        .attr("id", "axis1")
        .attr("transform", "translate(0," + 290 + ")")
        .call(d3.axisBottom(x3).ticks(d3.timeMonth, 2).tickFormat(d3.timeFormat("%b")))
        .style("font-size", 0)

        
   var axis2 = g.append("g")
        .attr("class", "axis axis--x")
        .attr("id", "axis3")
        .attr("transform", "translate(0," + 310 + ")")
        .call(d3.axisBottom(x3).ticks(d3.timeYear,1).tickFormat(d3.timeFormat("%Y")))
        .style("font-size", 0)

         d3.selectAll(".axis")
         .transition()
         .delay(200)
         .duration(200)
         .style("font-size", textSize)
         
    var cell = g.append("g")
        .attr("class", "cells")
        .selectAll("g")
        .data(d3.voronoi()
        .extent([[-marginA.left, -marginA.top], [widthA + marginA.right, heightA + marginA.top]])
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .polygons(data)).enter().append("g")
        .attr("id", function(d) {
            return "<span class = 'titleStyle'>" + d.data.Title.replace(/ /g, "_") + "</span>" +  "*" 
                + d.data.Genre.replace(/ /g, "_").replace("/", "&") + "*"
                + "Opening: " + intToMoneyFormatter.format (d.data['Opening Gross']) + "*"
                + "Total: " + intToMoneyFormatter.format (d.data['Total Gross']) + "*"
        });

            
           
    var circle = cell.append("circle")
        .attr("class", "circle")
        .attr("cx", function(d) { if (d) { return d.data.x }; })
        .attr("cy", function(d) { if (d) { return d.data.y }; })
        .transition()
        .delay(100)
        .duration(200)
        .attr("r", function(d) { return myScale(d.data['Opening Gross']) })
        .attr('fill', function(d){return colorScale(d.data.simpleGenre) })
        

    cell.append("path")
        .attr("d", function(d) { if (d) { return "M" + d.join("L") + "Z"; } })

    
        cell.on("mouseover", function(d){
            d3.selectAll('.tooltip')
            .attr('id','tooltip')
            
            var movieTitle = this.id
            
            d3.selectAll('#tooltip')
                .html(function(d){
                    return(movieTitle.replace(/_/g, " ").replace(/\*/g, "</br>"))
                 })
                .style("opacity", 1)
                .style("left", (d3.event.pageX + -70) + "px")		
                .style("top", (d3.event.pageY + - 150) + "px");
            })
            
            .on("mouseout", function(d){
            d3.selectAll('.tooltip')
            .style("opacity",0)
            .html("")
            });
            
            
}


////////////////////////////////////////////
////////////////Create legend//////////////////
////////////////////////////////////////


function renderLegend(data){
    var N = [ d3.min (testMaxOpening), d3.max(testMaxOpening)/4, d3.max(testMaxOpening)*.75, d3.max(testMaxOpening)];
    N = N.reverse()

    var sizeScale = d3.scaleLinear()
        .domain([0, d3.max(testMaxOpening)])
        .range([2, 30]);

    var legendSvg = d3.selectAll(".legend")
                    .append('svg')
                    .attr('class', "legendSvg")
                    .attr('width', widthA)
                    .attr('height', 400)
                    // .attr('x', 300)
                    // .attr("align","right");
    var legendG  = legendSvg.append('g')
            .attr("transform", "translate("+ widthA/1.3 + "," + 130 + ")");

    var legendCircle = legendG.selectAll(".legendCircle")
                        .data(N)
                        .enter()
                        .append('circle')
                        .attr('cx', function(d) {return 70})
                        .attr('cy', function(d) {return sizeScale(d)})
                        .attr('r', function(d) {return sizeScale(d)})
                        .attr('stroke', "gray")
                        .attr('fill', 'none')

    var legendLablesG = legendSvg
                        .append('g')
                        .attr('class', 'legendG')
                        .attr("transform", "translate("+ widthA/1.3 + "," + 122 + ")");
        
                     
        var preText = legendLablesG.append('text')
                      .text(function(d){return "Opening Gross of: "})
                      .attr('text-anchor', 'middle')
                      .attr('x', 70)
                      .attr('y', -10)
                      .style('font-size', 10)
                    
        var topText = legendLablesG.append('text')
                      .text(function(d){return intToMoneyFormatter.format(d3.min(testMaxOpening))})
                      .attr('text-anchor', 'middle')
                      .attr('x', 70)
                      .attr('y', 5)
                      .style('font-size', textSize)

        var bottomText = legendLablesG.append('text')
                        .text(function(d){return intToMoneyFormatter.format(d3.max (testMaxOpening))})
                        .attr('text-anchor', 'middle')
                        .attr('x', 70)
                        .attr('y', 80)
                        .style('font-size', textSize)
                        
}

////////////////////////////////////////////
////////////////Load Data//////////////////
////////////////////////////////////////

d3.csv("movies.csv", function(error, data) {
    console.log(data)
    data.forEach(function(d, i) {
        console.log(d)
        d['Opening Gross'] = d['Opening Gross'].replace('$', '').replace(/,/g, '')
        d['Opening Gross'] = +d['Opening Gross'];
        d['Total Gross'] = d['Total Gross'].replace('$', '').replace(/,/g, '')
        d['Total Gross'] = +d['Total Gross'];
        var month = d['Open Date'].split('/')[0]
        var day = d['Open Date'].split('/')[0]
        var genreSimple = d.Genre.split(' ')[0]
        d.month = +month;
        var averagedYear = month +"/"+ 1 +"/16"
        d.averagedYear = parseTime(averagedYear)
        d.averagedYear = d.averagedYear
        d['Open Date'] = parseTime(d['Open Date'])
        d.simpleGenre = genreSimple
        testMaxOpening.push(d['Opening Gross'])
        });
        
    data = data.sort(function (a, b) {return b['Opening Gross'].value - b['Opening Gross'].value;

    });
    
    
    
//////////////////////////////////////////////////////
////////Render final charts and Create buttons/////////// 
//////////////////////////////////////////////////////


d3.select("#button1").on("click", function(d) {

            
        d3.selectAll(".circle")
        .transition()
        .duration(200)
        .attr("r", function(d) { return 0})
        
         d3.selectAll('.axis')
        .transition()
        .duration(200)
        .style('font-size', 0)

        setTimeout(function(){ 
          d3.selectAll("#ga")
             .remove()
         }, 201);
     
        setTimeout(function(){ 
        renderA(data);
         }, 250);
     
}); 

d3.select("#button2").on("click", function(d) {
            
        d3.selectAll(".circle")
        .transition()
        .duration(200)
        .attr("r", function(d) { return 0})
        
        d3.selectAll('.axis')
        .transition()
        .duration(200)
        .style('font-size', 0)

        setTimeout(function(){ 
          d3.selectAll("#ga")
             .remove()
         }, 201);
     
        setTimeout(function(){ 
        renderB(data);
         }, 250);
     
}); 
        
        
//Opening render
    renderLegend(data);
    renderA(data);

    
    


});
