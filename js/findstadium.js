var map;
var oTable;

var min6M = new Array(100, 100, 100, 250, 500, 7000);
var min1A = new Array(500, 600, 1200, 1800, 1800, 7000);
var min2A = new Array(500, 1000, 1500, 3800, 4750, 8000);
var min3A = new Array(1000, 1500, 1500, 5000, 7000, 11000);
var min4A = new Array(1500, 1500, 5000, 5000, 7000, 11000);
var min5A = new Array(2250, 4000, 7000, 7000, 7000, 11000);

var max6M = new Array(15075, 15075, 15075, 15075, 23000, 80000);
var max1A = new Array(23000, 45000, 92200, 92200, 92200, 92200);
var max2A = new Array(50000, 50000, 92200, 92200, 92200, 92200);
var max3A = new Array(50500, 92200, 92200, 92200, 92200, 92200);
var max4A = new Array(92200, 92200, 92200, 92200, 92200, 92200);
var max5A = new Array(92200, 92200, 92200, 92200, 92200, 92200);

var med6M = new Array(1200, 1200, 2000, 3000, 3500, 15075);
var med1A = new Array(4250, 6500, 8046, 9000, 10000, 17000);
var med2A = new Array(7000, 8000, 9000, 10000, 11000, 13000);
var med3A = new Array(8500, 10000, 10250, 11000, 11134, 65812);
var med4A = new Array(9800, 11000, 12000, 15000, 16609, 72906);
var med5A = new Array(11000, 15000, 14787, 15218, 50000, 69500);

$(function () {
    $("#output").draggable();
    $("#pop_table").draggable();
});

$(document).ready(function () {

    //right-click to close table divs
    $('#output').mousedown(function (e) {
        if (e.button == 2) {
            $('#output2').empty();
            this.oncontextmenu = function () {
                return false;
            };
            return false;
        }
        return true;
    });


    $('#pop_table').mousedown(function (e) {
        if (e.button == 2) {
            $('#pop_table2').empty();

            this.oncontextmenu = function () {
                return false;
            };
            return false;
        }
        return true;
    });
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

    $.getJSON('https://elenaran.cartodb.com/api/v2/sql/?q=SELECT title FROM schools ORDER BY title', function (data) {
        $.each(data.rows, function (key, val) {
            document.forms[0].School1.options[document.forms[0].School1.length] = new Option(val.title, val.title);
            document.forms[0].School2.options[document.forms[0].School1.length] = new Option(val.title, val.title);
        });
    });
    new L.Control.Zoom({
        position: 'bottomleft'
    }).addTo(map);
    L.control.scale({
        position: 'bottomright'
    }).addTo(map);

}

function clearMap() {
    map.eachLayer(function (layer) {
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

        $('#output2').empty();
        $('#pop_table2').empty();
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
            .on('done', function (layer) {
                layer.setInteraction(true);
                layer.getSubLayer(0).set({
                    sql: sql1
                });
                layer.on('error', function (err) {
                    cartodb.log.log('error: ' + err);
                });
            }).on('error', function () {
                cartodb.log.log("some error occurred");
            });
        var sql = new cartodb.SQL({
            user: 'elenaran'
        });
        var schoolloc = [];
        $.getJSON('https://elenaran.cartodb.com/api/v2/sql/?q=' + sql1, function (data) {
            $.each(data.rows, function (key, val) {
                schoolloc.push(new L.latLng(val.lat, val.lng));
            });

            var schooldist = schoolloc[0].distanceTo(schoolloc[1]) / 1609.34;

            dist1sql = "ST_Distance(the_geom::geography,CDB_LatLng(" + schoolloc[0].lat + "," + schoolloc[0].lng + ")::geography)/1609.34"
            dist2sql = "ST_Distance(the_geom::geography,CDB_LatLng(" + schoolloc[1].lat + "," + schoolloc[1].lng + ")::geography)/1609.34"
            sql2 = "SELECT " + dist1sql + " AS dist1,";
            sql2 += dist2sql + " AS dist2,";
            sql2 += "CASE WHEN " + dist1sql + " > " + dist2sql + " THEN (((" + dist1sql + ")/(" + dist2sql + ")) * (" + dist1sql + " + " + dist2sql + ")^3 / (" + schooldist + "^3))";
            sql2 += "ELSE (((" + dist2sql + ")/(" + dist1sql + ")) * (" + dist1sql + " + " + dist2sql + ")^3 / (" + schooldist + "^3)) END AS score,";
            sql2 += " * FROM stadiums_usage where capacity>=" + parseInt(document.forms[0].txtMinCap.value) + " AND capacity<=" + parseInt(document.forms[0].txtMaxCap.value);
            if (document.forms[0].prioruse.checked && document.forms[0].Classification.value) {
                sql2 += " AND cnt" + document.forms[0].Classification.value + ">0" + " AND cnt" + document.forms[0].Classification.value + " IS NOT NULL"
            }
            if (document.forms[0].newlybuilt.checked) {
                var curdate = new Date();
                var curyear = parseInt(curdate.getFullYear());
                sql2 += " AND opened>" + (curyear - 5);
            }
            if (document.forms[0].sixmanfield.checked) {
                sql2 += " AND sixmanfield"
            }
            sql2 += " ORDER BY score LIMIT 50"
            maxminsql = sql2.replace(/\+/g, '%2B');
            $.getJSON('https://elenaran.cartodb.com/api/v2/sql/?q=SELECT cume, max(score) AS max_sc FROM (SELECT score, ntile(5) over (order by score) as cume FROM (' + maxminsql + ') AS DERIVEDTABLE) AS TMP group by cume order by cume desc', function (data) {

                var sizes = [2, 7.1, 12.2, 17.3, 22.4];
                var allcartocss = "#stadiums_usage{  marker-fill-opacity: 0.9;  marker-line-color: #FFF;  marker-line-width: 1.5;  marker-line-opacity: 1;  marker-placement: point;  marker-type: ellipse;  marker-fill: #0000FF;  marker-allow-overlap: true;}";
                $.each(data.rows, function (key, val) {
                    var value = val.max_sc;
                    var size = sizes[key];
                    allcartocss += '#stadiums_usage [score<=' + value + '] {marker-width:' + size + ';}';
                });
                if (document.forms[0].Classification.value) {
                    allcartocss += '#stadiums_usage [cnt' + document.forms[0].Classification.value.toLowerCase() + '>0]{marker-fill:#FF5C00;}';
                }

                var stadlayer;
                cartodb.createLayer(map, {
                        user_name: 'elenaran',
                        type: 'cartodb',
                        sublayers: [{
                            sql: sql2,
                            cartocss: allcartocss,
                            interactivity: "title, score, capacity, opened, sixmanfield"
                        }]
                    })
                    .addTo(map)
                    .on('done', function (layer) {
                        sql.getBounds(sql2).done(function (bounds) {
                            map.fitBounds(bounds);
                        });
                        var infowindow = cdb.vis.Vis.addInfowindow(map, layer.getSubLayer(0), ['title', 'owner', 'score', 'capacity', 'opened', 'sixmanfield']);
                        infowindow.model.set('template', $('#infowindow_template').html());
                        stadlayer = layer;

                        layer.on('error', function (err) {
                            cartodb.log.log('error: ' + err);
                        });
                    }).on('error', function () {
                        cartodb.log.log("some error occurred");
                    });


                $.getJSON('https://elenaran.cartodb.com/api/v2/sql/?q=' + maxminsql, function (data) {
                    var outtable = "";
                    outtable += "<table  id=\"outtable\" class=\"display compact\" cellspacing=\"0\" width=\"100%\">";
                    outtable += "<thead><tr><th>Name</th><th>Prior-Use</th><th>Year Built</th><th>Capacity</th><th>Score</th></thead>";
                    outtable += "<tbody>";
                    $.each(data.rows, function (key, val) {
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
                            if (val.cnt6m) {
                                outtable += "<a href='#' class='link2' title='" + val.title + "'' cls='" + document.forms[0].Classification.value + "''>" + val.cnt6m + "</a>";
                            }
                            break;
                        case "1A":
                            if (val.cnt1a) {
                                outtable += "<a href='#' class='link2' title='" + val.title + "'' cls='" + document.forms[0].Classification.value + "''>" + val.cnt1a + "</a>";
                            }
                            break;
                        case "2A":
                            if (val.cnt2a) {
                                outtable += "<a href='#' class='link2' title='" + val.title + "'' cls='" + document.forms[0].Classification.value + "''>" + val.cnt2a + "</a>";
                            }
                            break;
                        case "3A":
                            if (val.cnt3a) {
                                outtable += "<a href='#' class='link2' title='" + val.title + "'' cls='" + document.forms[0].Classification.value + "''>" + val.cnt3a + "</a>";
                            }
                            break;
                        case "4A":
                            if (val.cnt4a) {
                                outtable += "<a href='#' class='link2' title='" + val.title + "'' cls='" + document.forms[0].Classification.value + "''>" + val.cnt4a + "</a>";
                            }
                            break;
                        case "5A":
                            if (val.cnt5a) {
                                outtable += "<a href='#' class='link2' title='" + val.title + "'' cls='" + document.forms[0].Classification.value + "''>" + val.cnt5a + "</a>";
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

                    $(document).ready(function () {
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
                        $('.link').click(function () {
                            openInfowindow(stadlayer, [parseFloat($(this).attr('lat')), parseFloat($(this).attr('lng'))], $(this).attr('title'), $(this).attr('owner'), parseFloat($(this).attr('score')), parseInt($(this).attr('capacity')), parseInt($(this).attr('opened')), $(this).attr('sixmanfield'))
                            return false;
                        });
                        $('.link2').click(function () {
                            $('#pop_table2').empty();
                            $.getJSON("https://elenaran.cartodb.com/api/v2/sql/?q=SELECT location, class, round, year FROM pcap WHERE location='" + $(this).attr('title') + "' AND class='" + $(this).attr('cls') + "'", function (data) {

                                var headers = [];

                                var n = $('<thead></thead>');
                                for (i in data.fields) {
                                    headers.push(i);
                                    n.append($('<th></th>').text(i));
                                }
                                $('#pop_table2').append(n);
                                var i = 1;
                                data.rows.map(function (r) {
                                    if (i % 2 == 0) {
                                        n = $('<tr class="even"></tr>');
                                    } else {
                                        n = $('<tr class="odd"></tr>');
                                    }
                                    for (h in headers) {
                                        n.append($('<td></td>').text(r[headers[h]]));
                                    }
                                    $('#pop_table2').append(n);
                                    i++;
                                });
                            });

                            return false;
                        });
                    }
                });

            });
        });

    }
}

//function to set the capacities based on the Classification & Round selection
function setCapacities() {
    var classf = document.forms[0].Classification.options[document.forms[0].Classification.selectedIndex].value;
    var round = document.forms[0].Round.selectedIndex;
    if (document.forms[0].Classification.selectedIndex != 0 && round != 0) {
        switch (classf) {
        case "6M":
            document.forms[0].txtMinCap.value = min6M[round - 1];
            document.forms[0].txtMaxCap.value = max6M[round - 1];
            document.forms[0].txtMedCap.value = med6M[round - 1];
            break;
        case "1A":
            document.forms[0].txtMinCap.value = min1A[round - 1];
            document.forms[0].txtMaxCap.value = max1A[round - 1];
            document.forms[0].txtMedCap.value = med1A[round - 1];
            break;
        case "2A":
            document.forms[0].txtMinCap.value = min2A[round - 1];
            document.forms[0].txtMaxCap.value = max2A[round - 1];
            document.forms[0].txtMedCap.value = med2A[round - 1];
            break;
        case "3A":
            document.forms[0].txtMinCap.value = min3A[round - 1];
            document.forms[0].txtMaxCap.value = max3A[round - 1];
            document.forms[0].txtMedCap.value = med3A[round - 1];
            break;
        case "4A":
            document.forms[0].txtMinCap.value = min4A[round - 1];
            document.forms[0].txtMaxCap.value = max4A[round - 1];
            document.forms[0].txtMedCap.value = med4A[round - 1];
            break;
        case "5A":
            document.forms[0].txtMinCap.value = min5A[round - 1];
            document.forms[0].txtMaxCap.value = max5A[round - 1];
            document.forms[0].txtMedCap.value = med5A[round - 1];
            break;
        }
    }
}