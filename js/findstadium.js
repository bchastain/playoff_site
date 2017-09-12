var map;
var oTable;

var daysofmonth = new makeArray(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31);
var daysofmonthLY = new makeArray(31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31);

var classChart;
var roundChart;
var capacityChart;
var yearbuiltChart;
var playoffyearChart;
var ct;
var min;
var max;
var mean;
var median;
var stdev;

$(function() {
    $("#output").draggable({scroll: false});
    $("#pop_table").draggable({scroll: false});
    $("#legend").draggable({scroll: false});
});

$(document).ready(function() {

    //right-click to close table divs
    $('#output').mousedown(function(e) {
        if (e.button == 2) {
            $('#output2').empty();
            this.oncontextmenu = function() {
                return false;
            };
            return false;
        }
        return true;
    });


    $('#pop_table').mousedown(function(e) {
        if (e.button == 2) {
            $('#pop_table2').empty();

            this.oncontextmenu = function() {
                return false;
            };
            return false;
        }
        return true;
    });


    $('#legend').mousedown(function(e) {
        if (e.button == 2) {
            $('#legend2').empty();

            this.oncontextmenu = function() {
                return false;
            };
            return false;
        }
        return true;
    });


    $('#expandbtn').click(function() {
        $('#charts').slideToggle('slow');
    });


    $(".scrollable").mCustomScrollbar();
});

function initialize() {
    //Initialize map element
    map = new L.Map('map_canvas', {
        zoomControl: false,
        center: [32.24, -99.46],
        zoom: 6
    });
    L.tileLayer('https://{s}.tiles.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYmNoYXN0YWluIiwiYSI6IjZZaWVZcXcifQ.Hj7VWUW-4oo5Ijx_-2pXXg', {
        attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>'
    }).addTo(map);

    $.getJSON('https://elenaran.cartodb.com/api/v2/sql/?q=SELECT title, class, fid FROM schools ORDER BY title', function(data) {
        $.each(data.rows, function(key, val) {
            var x = (document.forms[0].School1.options[document.forms[0].School1.length] = new Option(val.title, val.title));
            x.setAttribute("class", val.class);
            x.setAttribute("fid", val.fid);
            var y = (document.forms[0].School2.options[document.forms[0].School1.length] = new Option(val.title, val.title));
            y.setAttribute("class", val.class);
            y.setAttribute("fid", val.fid);
        });
    });
    new L.Control.Zoom({
        position: 'bottomleft'
    }).addTo(map);
    L.control.scale({
        position: 'bottomright'
    }).addTo(map);
    //Initialize charts
    chartSetup().then(function() {
        //Selection setup
        selectionSetup();
    });
}

function clearMap() {
    map.eachLayer(function(layer) {
        //only remove cartodb layers, not basemap
        if (layer.type) {
            map.removeLayer(layer);
        }

    });
    if (oTable != null) {
        oTable.fnDestroy();
    }
    //Remove all the DOM elements
    $('#output2').empty();
    $('#pop_table2').empty();
}

function openInfowindow(layer, latlng, title, owner, score, capacity, opened, sixmanfield) {
    layer.trigger('featureClick', null, latlng, null, {
        title: title,
        owner: owner,
        score: score,
        capacity: capacity,
        opened: opened,
        sixmanfield: sixmanfield
    }, 0);
}


function findCity() {
    //set to the active element in the combobox
    var which1 = document.forms[0].School1.value;
    var which2 = document.forms[0].School2.value;

    //if both comboboxes have been selected, continue
    if (which1 != "" && which2 != "") {
        $("div#panel").slideUp("slow");
        $("#toggle a").toggle();
        $(".loader").show();

        $('#output2').empty();
        $('#pop_table2').empty();
        $('#legend2').empty();
        var plusRE = /\+/;
        which1 = which1.replace(plusRE, '\\u002b');
        which2 = which2.replace(plusRE, '\\u002b');
        var quoteRE = /'/;
        which1 = which1.replace(quoteRE, '\'\'');
        which2 = which2.replace(quoteRE, '\'\'');
        //Reset variables & clear overlays
        sql1 = "SELECT * FROM schools where title~~E'" + which1 + "' OR title~~E'" + which2 + "'";
        cartodb.createLayer(map, 'https://elenaran.cartodb.com/api/v2/viz/59813fd8-0f94-11e5-a5b5-0e9d821ea90d/viz.json')
            .addTo(map)
            .on('done', function(layer) {
                layer.setInteraction(true);
                layer.getSubLayer(0).set({
                    sql: sql1
                });
                layer.on('error', function(err) {
                    cartodb.log.log('error: ' + err);
                });
            }).on('error', function() {
                cartodb.log.log("some error occurred");
                $(".loader").hide();
            });
        var sql = new cartodb.SQL({
            user: 'elenaran'
        });


        var opts = {
          where: '(OriginOID=' + $('#School1 :selected').attr('fid') + ' AND DestinationOID=' + $('#School2 :selected').attr('fid') + ') OR (OriginOID=' + $('#School2 :selected').attr('fid') + ' AND DestinationOID=' + $('#School1 :selected').attr('fid') + ')',
          outFields: "OriginOID, DestinationOID, Total_Time",
          returnGeometry: false,
          f: 'pjson'
        }

        $.getJSON("https://services2.arcgis.com/VNo0ht0YPXJoI4oE/arcgis/rest/services/OD_Schools_to_Schools/FeatureServer/0/query", opts, function(results) {
          var betweenSchools = results.features[1].attributes.Total_Time;
          if (results.features[0].attributes.Total_Time < results.features[1].attributes.Total_Time) {
            betweenSchools = results.features[0].attributes.Total_Time;
          }

          opts.where = 'OriginOID=' + $('#School1 :selected').attr('fid') + ' OR OriginOID=' + $('#School2 :selected').attr('fid');
          var stadiums = [];

          $.getJSON("https://services2.arcgis.com/VNo0ht0YPXJoI4oE/arcgis/rest/services/OD_Schools_to_Stadiums/FeatureServer/0/query", opts, function(results) {
            var resultItems = [];
            var resultCount = results.features.length;
            for (var i = 1; i <= resultCount/2; i++) {
              stadiums.push({"DestinationOID": i});
            }
            results.features.forEach(function (o) {
              var s = stadiums.filter(function (st) {
                return st.DestinationOID == o.attributes.DestinationOID;
              })[0];
              if (!s["School1"]) {
                s["School1"] = o.attributes.Total_Time;
              } else {
                var score = (s["School1"] / o.attributes.Total_Time) * Math.pow(s["School1"] + o.attributes.Total_Time, 3) / Math.pow(betweenSchools, 3);
                if (s["School1"] < o.attributes.Total_Time) {
                  score = (o.attributes.Total_Time / s["School1"]) * Math.pow(s["School1"] + o.attributes.Total_Time, 3) / Math.pow(betweenSchools, 3);
                }
                delete s["School1"];
                s["score"] = score;
              }
            });



            var filtersql = "SELECT * FROM stadiums_usage where capacity>=" + parseInt($('#slider-range [class*=ui-slider-pip-selected] .ui-slider-label')[0].innerHTML.replace(/,/g, '')) + " AND capacity<=" + parseInt($('#slider-range [class*=ui-slider-pip-selected] .ui-slider-label')[1].innerHTML.replace(/,/g, ''));
            if (document.forms[0].prioruse.checked && document.forms[0].Classification.value) {
                  filtersql += " AND count" + document.forms[0].Classification.value + ">0" + " AND count" + document.forms[0].Classification.value + " IS NOT NULL"
            }
            if (document.forms[0].newlybuilt.checked) {
                var curdate = new Date();
                var curyear = parseInt(curdate.getFullYear());
                filtersql += " AND opened>" + (curyear - 5);
            }
            if (document.forms[0].sixmanfield.checked) {
                filtersql += " AND sixmanfield"
            }
            filtersql.replace(/\+/g, '%2B');
            $.getJSON('https://elenaran.cartodb.com/api/v2/sql/?q=' + filtersql, function(data) {
              var joined = _.map(data.rows, function(obj) {
                  // add the properties from second array matching the userID
                  // to the object from first array and return the updated object
                  return _.assign(obj, _.find(stadiums, {DestinationOID: obj.fid}));
              }).sort(function(a, b) { return a.score - b.score }).slice(0,50);

              var sizes = [5.2, 7.1, 12.2, 17.3, 22.4];
              var ntiles = joined.map(function(d) { return d.score; }).reverse();
              if (ntiles.length > 5) {
                ntiles = ss.ckmeans(joined.map(function(d) { return d.score; }), 5).reverse();
              }
              var allcartocss = "#stadiums_usage{  marker-fill-opacity: 0.9;  marker-line-color: #FFF;  marker-line-width: 1.5;  marker-line-opacity: 1;  marker-placement: point;  marker-type: ellipse;  marker-fill: #0000FF;  marker-allow-overlap: true;}";
              $.each(ntiles, function(key, val) {
                  var value = val;
                  if(value.length > 1) {
                    value = val[val.length-1];
                  }
                  var size = sizes[key];
                  allcartocss += ' #stadiums_usage [score<=' + value + '] {marker-width:' + size + ';}';
              });
              if (document.forms[0].Classification.value) {
                  allcartocss += ' #stadiums_usage [count' + document.forms[0].Classification.value.toLowerCase() + '>0]{marker-fill:#FF5C00;}';
                  if (document.forms[0].Round.value) {

                    for (var r = 0; r < document.forms[0].Round.length; r++) {
                      if (r >= document.forms[0].Round.selectedIndex) {
                        allcartocss += ' #stadiums_usage [count' + document.forms[0].Classification.value.toLowerCase() + document.forms[0].Round[r].value.toLowerCase() + '>0]{marker-fill:#FFFF00;}';
                      }
                    }
                  }
              }

              var sql2 = "SELECT CASE "
              joined.forEach(function(d) {
                sql2 += "WHEN fid=" + d.fid + " THEN " + d.score + " ";
              })
              sql2 += "END AS score, * from stadiums_usage WHERE fid in (" + joined.map(function(d) { return d.fid; }).join() + ")";

              var stadlayer;
              // Stadium map layer creation
              cartodb.createLayer(map, {
                user_name: 'elenaran',
                type: 'cartodb',
                sublayers: [{
                    sql: sql2,
                    cartocss: allcartocss,
                    interactivity: "title, score, capacity, opened, sixmanfield"
                }]
              }).addTo(map)
                .on('done', function(layer) {
                  sql.getBounds(sql2).done(function(bounds) {
                    var stadbounds = bounds;
                    sql.getBounds(sql1).done(function(bounds) {
                      if(bounds[0][0] < stadbounds[0][0]) {
                        bounds[0][0] = stadbounds[0][0];
                      }
                      if(bounds[0][1] < stadbounds[0][1]) {
                        bounds[0][1] = stadbounds[0][1];
                      }
                      if(bounds[1][0] > stadbounds[1][0]) {
                        bounds[1][0] = stadbounds[1][0];
                      }
                      if(bounds[1][1] > stadbounds[1][1]) {
                        bounds[1][1] = stadbounds[1][1];
                      }
                      map.fitBounds(bounds);
                    })
                  });
                  var infowindow = cdb.vis.Vis.addInfowindow(map, layer.getSubLayer(0), ['title', 'owner', 'score', 'capacity', 'opened', 'sixmanfield']);
                  infowindow.model.set('template', $('#infowindow_template').html());
                  stadlayer = layer;

                  layer.on('error', function(err) {
                      cartodb.log.log('error: ' + err);
                  });



                  // Table output
                  var outtable = "";
                  outtable += "<table  id=\"outtable\" class=\"display compact\" cellspacing=\"0\" width=\"100%\">";
                  outtable += "<thead><tr><th>Name</th><th>Prior-Use</th><th>Year Built</th><th>Capacity</th><th>Score</th></thead>";
                  outtable += "<tbody>";
                  $.each(joined, function(key, val) {
                      if (key % 2 == 0) {
                          outtable += '<tr class="even">';
                      } else {
                          outtable += '<tr class="odd">';
                      }
                      outtable += "<td><a href='#' class='link' title='" + val.title + "' owner='" + val.owner;
                      outtable += "' lat=" + val.lat + " lng=" + val.lng + " opened=" + val.opened;
                      outtable += " score=" + val.score + " capacity=" + val.capacity + " sixmanfield=" + val.sixmanfield;
                      outtable += ">" + val.title + "</a></td><td>";
                      switch (document.forms[0].Classification.value) {
                          case "6M":
                              if (val.count6m) {
                                  outtable += "<a href='#' class='link2' title='" + val.title + "'' cls='" + document.forms[0].Classification.value + "''>" + val.count6m + "</a>";
                              }
                              break;
                          case "1A":
                              if (val.count1a) {
                                  outtable += "<a href='#' class='link2' title='" + val.title + "'' cls='" + document.forms[0].Classification.value + "''>" + val.count1a + "</a>";
                              }
                              break;
                          case "2A":
                              if (val.count2a) {
                                  outtable += "<a href='#' class='link2' title='" + val.title + "'' cls='" + document.forms[0].Classification.value + "''>" + val.count2a + "</a>";
                              }
                              break;
                          case "3A":
                              if (val.count3a) {
                                  outtable += "<a href='#' class='link2' title='" + val.title + "'' cls='" + document.forms[0].Classification.value + "''>" + val.count3a + "</a>";
                              }
                              break;
                          case "4A":
                              if (val.count4a) {
                                  outtable += "<a href='#' class='link2' title='" + val.title + "'' cls='" + document.forms[0].Classification.value + "''>" + val.count4a + "</a>";
                              }
                              break;
                          case "5A":
                              if (val.count5a) {
                                  outtable += "<a href='#' class='link2' title='" + val.title + "'' cls='" + document.forms[0].Classification.value + "''>" + val.count5a + "</a>";
                              }
                              break;
                      }
                      outtable += "</td><td>";
                      if (val.opened > 0) {
                          outtable += val.opened;
                      }
                      outtable += "</td><td>" + val.capacity + "</td><td>" + val.score.toFixed(4) + "</td></tr>";
                  });
                  outtable += "</tbody></table>";
                  document.getElementById('output2').innerHTML += outtable;

                  $(".loader").hide();

                  var legend = new cdb.geo.ui.Legend({
                    type: "bubble",
                    data: [
                     { value: "Less Ideal" },
                     { value: "More Ideal" },
                     { name: "graph_color", value: "#F00" }
                    ]
                  });
                  var choropleth = new cdb.geo.ui.Legend({
                    type: "category",
                    data: [
                      { name: "Prior use in current class in current round or higher", value: "#FF0" },
                      { name: "Prior use in current class in any round", value: "#FF5C00" },
                      { name: "No prior use", value: "#00F" }
                    ]
                  });
                  var stackedLegend = new cdb.geo.ui.StackedLegend({
                    legends: [choropleth, legend]
                  });
                  $('#legend2').empty();
                  $('#legend2').append(stackedLegend.render().el.innerHTML);

                  $(document).ready(function() {
                      oTable = $('#outtable').dataTable({
                          "bJQueryUI": true,
                          "bProcessing": true,
                          "paging": false,
                          "ordering": false,
                          "searching": false,
                          "info": false
                      });

                      $(".scrollable").mCustomScrollbar();

                  });

                  if (stadlayer) {
                      $('.link').click(function() {
                          openInfowindow(stadlayer, [parseFloat($(this).attr('lat')), parseFloat($(this).attr('lng'))], $(this).attr('title'), $(this).attr('owner'), parseFloat($(this).attr('score')), parseInt($(this).attr('capacity')), parseInt($(this).attr('opened')), $(this).attr('sixmanfield'))
                          return false;
                      });
                      $('.link2').click(function() {
                          $('#pop_table2').empty();
                          $.getJSON("https://elenaran.cartodb.com/api/v2/sql/?q=SELECT location, class, round, year FROM pcap WHERE location='" + $(this).attr('title').replace('&','%26') + "' AND class='" + $(this).attr('cls') + "'", function(data) {

                              var headers = [];

                              var n = $('<thead></thead>');
                              for (i in data.fields) {
                                  headers.push(i);
                                  n.append($('<th></th>').text(i));
                              }
                              $('#pop_table2').append(n);
                              var i = 1;
                              data.rows.map(function(r) {
                                  if (i % 2 == 0) {
                                      n = $('<tr class="even"></tr>');
                                  } else {
                                      n = $('<tr class="odd"></tr>');
                                  }
                                  for (h in headers) {
                                      n.append($('<td></td>').text(r[headers[h]]));
                                  }
                                  // 5A->6A conversion
                                  var matches = n[0].innerHTML.match('(.*<td>)([1-6])[AM](</td>.*)');
                                  n[0].innerHTML = matches[1] + (Number(matches[2]) % 6 + 1) + 'A' + matches[3];

                                  $('#pop_table2').append(n);
                                  i++;
                              });

                          });

                          return false;
                      });
                  }


                })
                .on('error', function() {
                    cartodb.log.log("some error occurred");
                });


              


            });


          });

        });

    }
}

function capToIndex(val) {
    var toIndex = 0;
    if (val <= 2000) {
        toIndex = val / 100;
    } else if (val <= 25000) {
        toIndex = (val - 2000) / 500 + 20
    } else {
        toIndex = ((val - 25000) * 34 / 77000) + 66
    }
    return toIndex;
}

//function to set class combobox
function setClass() {
    $("#Classification option").filter(function() {
        return this.text == $('#School1 :selected').attr('class');
    }).prop('selected', true);
}

//Initialize charts
function chartSetup() {
    classChart = dc.pieChart('#class-chart');
    roundChart = dc.pieChart('#round-chart');
    capacityChart = dc.barChart('#capacity-chart');
    yearbuiltChart = dc.barChart('#yearbuilt-chart');
    playoffyearChart = dc.barChart('#playoffyear-chart');
    ct = dc.numberDisplay("#ct");
    min = dc.numberDisplay("#min");
    max = dc.numberDisplay("#max");
    mean = dc.numberDisplay("#mean");
    median = dc.numberDisplay("#median");
    stdev = dc.numberDisplay("#stdev");
    //### Load your data

    var sql = 'SELECT pcap.cartodb_id, pcap.class, pcap.division, pcap.location,' +
        'stadiums_usage.title, pcap.round, pcap.year, stadiums_usage.capacity, ' +
        'stadiums_usage.opened, stadiums_usage.owner ' +
        'FROM pcap LEFT JOIN stadiums_usage ON pcap.location=stadiums_usage.title';
    return $.getJSON('https://elenaran.cartodb.com/api/v2/sql/?q=' + sql, function(data) {
        var pcap = crossfilter(data.rows);
        var all = pcap.groupAll();

        var classDimension = pcap.dimension(function(d) {
            return (Number(d.class[0]) % 6 + 1) + "A";
        });

        var roundDimension = pcap.dimension(function(d) {
            return d.round.toLowerCase().split('-')
                .map(function(i) {
                    return i[0] != 'o' ? i[0].toUpperCase() + i.substring(1) : i
                })
                .join(' ')
        });

        var capacityDimension = pcap.dimension(function(d) {
            return d.capacity;
        });

        var allDimension = pcap.dimension(function(d) {
            return 1;
        });


        var playoffyearDimension = pcap.dimension(function(d) {
            return d.year;
        });

        var yearbuiltDimension = pcap.dimension(function(d) {
            return d.opened;
        });

        // Produce counts records in the dimension
        var classGroup = classDimension.group();


        // Produce counts records in the dimension
        var roundGroup = roundDimension.group();


        var capacityGroup = capacityDimension.group(function(d) {
            return Math.floor(d / 1000) * 1000;
        });

        var capstatGroup = reductio()
            .count(function(d) {
                return d.capacity
            })
            .min(function(d) {
                return d.capacity
            })
            .max(function(d) {
                return d.capacity
            })
            .avg(function(d) {
                return d.capacity
            })
            .median(function(d) {
                return d.capacity
            })
            .std(function(d) {
                return d.capacity
            })
            (allDimension.group());

        var playoffyearGroup = reductio()
            .median(function(d) {
                return d.capacity
            })
            (playoffyearDimension.group());

        var yearbuiltGroup = yearbuiltDimension.group(function(d) {
            return Math.floor(d / 10) * 10;
        });

        classChart /* dc.pieChart('#gain-loss-chart', 'chartGroup') */
        // (_optional_) define chart width, `default = 200`
            .width(250)
            // (optional) define chart height, `default = 200`
            .height(220)
            // Define pie radius
            .radius(100)
            // Set dimension
            .dimension(classDimension)
            // Set group
            .group(classGroup)
            .colors(d3.scale.ordinal().range(colorbrewer.Paired[6]))
            .legend(dc.legend().x(250).y(10))
            // (_optional_) by default pie chart will use `group.key` as its label but you can overwrite it with a closure.
            .label(function(d) {
                if (classChart.hasFilter() && !classChart.hasFilter(d.key)) {
                    return '0%';
                }
                var label = '';
                if (all.value()) {
                    label += Math.floor(d.value / all.value() * 100) + '%';
                }
                return label;
            })


        roundChart /* dc.pieChart('#gain-loss-chart', 'chartGroup') */
        // (_optional_) define chart width, `default = 200`
            .width(250)
            // (optional) define chart height, `default = 200`
            .height(220)
            // Define pie radius
            .radius(100)
            // Set dimension
            .dimension(roundDimension)
            // Set group
            .group(roundGroup)
            .ordering(function(d) {
                return -d.value;
            })
            .colors(d3.scale.ordinal().range(colorbrewer.Paired[6]))
            .legend(dc.legend().x(250).y(10))
            // (_optional_) by default pie chart will use `group.key` as its label but you can overwrite it with a closure.
            .label(function(d) {
                if (roundChart.hasFilter() && !roundChart.hasFilter(d.key)) {
                    return '0%';
                }
                var label = '';
                if (all.value()) {
                    label += Math.floor(d.value / all.value() * 100) + '%';
                }
                return label;
            })

        dc.override(roundChart, 'legendables', function() {
            var legendables = roundChart._legendables();
            return legendables.sort(function(a, b) {
                return a.data < b.data;
            });
        })



        capacityChart
            .width(770)
            .height(220)
            .margins({
                top: 10,
                right: 50,
                bottom: 30,
                left: 40
            })
            .dimension(capacityDimension)
            .group(capacityGroup)
            .elasticY(true)
            // (_optional_) set gap between bars manually in px, `default=2`
            .gap(1)
            // (_optional_) set filter brush rounding
            .round(dc.round.floor)
            .alwaysUseRounding(true)
            .x(d3.scale.linear().domain([0, 103000]))
            .xUnits(dc.units.fp.precision(1000))
            .renderHorizontalGridLines(true)
            // Customize the filter displayed in the control span
            .filterPrinter(function(filters) {
                var filter = filters[0],
                    s = '';
                s += filter[0] + ' -> ' + filter[1];
                return s;
            });

        // Customize axes
        //capacityChart.xAxis().tickFormat(
        //    function (v) { return v + '%'; });
        capacityChart.yAxis().ticks(5);


        playoffyearChart
            .width(390)
            .height(220)
            .margins({
                top: 10,
                right: 50,
                bottom: 30,
                left: 40
            })
            .dimension(playoffyearDimension)
            .group(playoffyearGroup)
            .elasticY(true)
            .centerBar(true)
            // (_optional_) set gap between bars manually in px, `default=2`
            .gap(1)
            .x(d3.scale.linear().domain([2003.5, 2016.5]))
            .xUnits(dc.units.fp.precision(1))
            .valueAccessor(function(d) {
                return d.value.median;
            })
            .colors(d3.scale.ordinal().range(['#d95f02']))
            .renderHorizontalGridLines(true)
            // Customize the filter displayed in the control span
            .filterPrinter(function(filters) {
                var filter = filters[0],
                    s = '';
                s += d3.format('.0f')(Math.floor(filter[0])) + ' -> ' + d3.format('.0f')(Math.floor(filter[1]));
                return s;
            });

        playoffyearChart.xAxis().tickFormat(d3.format("d"));


        yearbuiltChart
            .width(390)
            .height(220)
            .margins({
                top: 10,
                right: 50,
                bottom: 30,
                left: 40
            })
            .dimension(yearbuiltDimension)
            .group(yearbuiltGroup)
            .elasticY(true)
            // (_optional_) set gap between bars manually in px, `default=2`
            .gap(1)
            // (_optional_) set filter brush rounding
            .round(dc.round.floor)
            .alwaysUseRounding(true)
            .x(d3.scale.linear().domain([1910, 2017]))
            .xUnits(dc.units.fp.precision(10))
            .colors(d3.scale.ordinal().range(['#1b9e77']))
            .renderHorizontalGridLines(true)
            // Customize the filter displayed in the control span
            .filterPrinter(function(filters) {
                var filter = filters[0],
                    s = '';
                s += filter[0] + ' -> ' + filter[1];
                return s;
            });

        yearbuiltChart.xAxis().tickFormat(d3.format("d"));


        ct
            .group(capstatGroup)
            .valueAccessor(function(d) {
                return d.value.count;
            })
            .formatNumber(d3.format(",.0f"));
        min
            .group(capstatGroup)
            .valueAccessor(function(d) {
                return d.value.min;
            })
            .formatNumber(d3.format(",.0f"));
        max
            .group(capstatGroup)
            .valueAccessor(function(d) {
                return d.value.max;
            })
            .formatNumber(d3.format(",.0f"));
        mean
            .group(capstatGroup)
            .valueAccessor(function(d) {
                return d.value.avg;
            })
            .formatNumber(d3.format(",.0f"));
        median
            .group(capstatGroup)
            .valueAccessor(function(d) {
                return d.value.median;
            })
            .formatNumber(d3.format(",.0f"));
        stdev
            .group(capstatGroup)
            .valueAccessor(function(d) {
                return d.value.std;
            })
            .formatNumber(d3.format(",.0f"));


        dc.renderAll();
        //$('#class-chart svg').css('width', '400px');
        //$('#round-chart svg').css('width', '400px');
    });
}

function DayOfWeek(day, month, year) {
    var a = Math.floor((14 - month) / 12);
    var y = year - a;
    var m = month + 12 * a - 2;
    var d = (day + y + Math.floor(y / 4) - Math.floor(y / 100) +
        Math.floor(y / 400) + Math.floor((31 * m) / 12)) % 7;
    return d + 1;
}

function makeArray() {
    this[0] = makeArray.arguments.length;
    for (i = 0; i < makeArray.arguments.length; i++)
        this[i + 1] = makeArray.arguments[i];
}

function LeapYear(year) {
    if ((year / 4) != Math.floor(year / 4)) return false;
    if ((year / 100) != Math.floor(year / 100)) return true;
    if ((year / 400) != Math.floor(year / 400)) return false;
    return true;
}

function NthDay(nth, weekday, month, year) {
    if (nth > 0) return (nth - 1) * 7 + 1 + (7 + weekday - DayOfWeek((nth - 1) * 7 + 1, month, year)) % 7;
    if (LeapYear(year)) var days = daysofmonthLY[month];
    else var days = daysofmonth[month];
    return days - (DayOfWeek(days, month, year) - weekday + 7) % 7;
}

//function to set the capacities based on the Classification & Round selection
function setCapacities() {
    var classf = document.forms[0].Classification.options[document.forms[0].Classification.selectedIndex].value;
    var round = document.forms[0].Round.selectedIndex;

    roundChart.filterAll();
    classChart.filterAll();
    dc.redrawAll();
    if (round) {
        //Filter class chart
        roundChart._onClick(roundChart.data()[round - 1]);
    }
    if (classf) {
        //Filter class chart
        classChart._onClick(classChart.data().filter(function(d) {
            return d.key == (Number(classf[0]) % 6 + 1) + "A";
        })[0]);
    }

    var updateSlider = function() {
        if (document.forms[0].Classification.selectedIndex != 0 && round != 0) {
            var newMin = Number(jQuery('#min .number-display')[0].innerHTML.replace(/,/g, ''));
            var newMax = Number(jQuery('#max .number-display')[0].innerHTML.replace(/,/g, ''));
            $("#slider-range").slider({
                values: [capToIndex(newMin), capToIndex(newMax) + 1]
            });
        }

        roundChart.on("postRedraw", function(){});
        classChart.on("postRedraw", function(){});
    }

    roundChart.on("postRedraw", updateSlider);
    classChart.on("postRedraw", updateSlider);

}

function selectionSetup() {
    var seasonstart = new Date(new Date().getFullYear(), 10, NthDay(2, 4, 11, new Date().getFullYear()));
    var week = Math.min(Math.max(Math.floor((new Date() - seasonstart) / 1000 / 60 / 60 / 24 / 7), 0), 5);

    var updateClassAndRound = function(school) {
        var myclass = $(school + ' :selected').attr('class');
        if (myclass == '1A') {
            $('#Round option').eq(week + 2).prop('selected', true).change();
            $('#roundrow input.ui-autocomplete-input').val($('#Round :selected').text());
        } else {
            $('#Round option').eq(week + 1).prop('selected', true).change();
            $('#roundrow input.ui-autocomplete-input').val($('#Round :selected').text());
        }
        //Set class dropdown
        $("#Classification option").filter(function() {
            return this.text == myclass;
        }).prop('selected', true).change();
        $('#classrow input.ui-autocomplete-input').val(myclass);
    }

    $("#School1").combobox({
        select: function(event, ui) {
            updateClassAndRound("#School1")
        }
    });
    $("#School2").combobox({
        select: function(event, ui) {
            updateClassAndRound("#School2")
        }
    });
    $("#Classification").combobox({
        select: function(event, ui) {
            setCapacities();
        }
    });
    $('#classrow input.ui-autocomplete-input').css('width', '110px')
    $("#Round").combobox({
        select: function(event, ui) {
            setCapacities();
        }
    });
    $('#roundrow input.ui-autocomplete-input').css('width', '110px')
}