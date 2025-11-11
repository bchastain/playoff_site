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
var slider;
// Async flag for when the schools drop-downs have been populated
var SCHOOLS_LOADED = $.Deferred();
// Cached URL state parsed on load
var _URL_STATE = null;

// AGOL configuration (adjust field names if your schemas differ)
var AGOL_CONFIG = {
    schools: {
        url: 'https://services2.arcgis.com/VNo0ht0YPXJoI4oE/arcgis/rest/services/Texas_Public_High_Schools_with_Football_Programs/FeatureServer/0',
        fields: {
            school: 'school',      // display name field
            class: 'class',       // UIL class field (e.g., 1A..6A)
            fid:   'FID'          // stable numeric id matching OD matrices
        }
    },
    stadiums: {
        // Switched to published Stadiums_Usage layer (includes prior-use counts)
        url: 'https://services2.arcgis.com/VNo0ht0YPXJoI4oE/ArcGIS/rest/services/Stadiums_Usage/FeatureServer/3',
        fields: {
            title: 'name',
            owner: 'owner',
            lat:   'lat',
            lng:   'long',
            opened:'year_opene',
            capacity: 'capacity',
            sixmanfield: 'sixmanfield', // integer flag (1=true)
            fid: 'fid' // actual field name is lowercase in returned features
        }
    },
    // Once you publish PCAP as a hosted table, set its layer URL below and the charts will enable automatically
    pcap: { url: 'https://services2.arcgis.com/VNo0ht0YPXJoI4oE/ArcGIS/rest/services/UIL_Football_Playoff_Stadium_Usage_by_Year_and_Class/FeatureServer/0' } // PCAP events table
};

// Keep track of dynamic layers we add so we can clear them reliably
var activeLayers = [];
// Map of stadium fid -> Leaflet marker (for table hover highlighting)
var stadiumMarkerByFid = {};
var _PCAP_ROWS_FULL = null; // full PCAP event rows for prior-use popup (Location, Class, Round, Year)

// Debug toggle: enable with ?debug=1 or localStorage.DEBUG_PLAYOFF='1'
var DEBUG = /[?&]debug=1/i.test(location.search) || (function(){ try { return localStorage.getItem('DEBUG_PLAYOFF') === '1'; } catch(e){ return false; } })();
function debugLog(){ if (!DEBUG) return; try { console.log.apply(console, arguments); } catch(e){} }
// (Startup banner removed per user request; enable verbose logs with ?debug=1)
// Helper to toggle debug from console without typing the full storage line
window.enablePlayoffDebug = function(on){
    try {
        localStorage.setItem('DEBUG_PLAYOFF', on ? '1' : '0');
    if (DEBUG) { try { console.log('[playoff] DEBUG set to', on ? 'ON' : 'OFF', '— reloading...'); } catch(e){} }
        location.reload();
    } catch(e){
        alert('Unable to toggle debug: ' + e);
    }
};

// Simple debug logger and error helper
function showError(message, details) {
    try {
        $(".loader").hide();
        var msg = '<div class="error" style="padding:8px;color:#b00020;">' +
                  $('<div>').text(message).html() +
                  (details ? '<br/><small>' + $('<div>').text(details).html() + '</small>' : '') +
                  '</div>';
        $('#output2').html(msg);
        debugLog('[UI] showError:', message, details || '');
    } catch(e) {
        alert(message + (details ? ('\n' + details) : ''));
    }
}

var SCHOOLJSON = {"id":"59813fd8-0f94-11e5-a5b5-0e9d821ea90d","version":"0.1.0","title":"schools 1","description":null,"scrollwheel":false,"legends":false,"url":null,"map_provider":"leaflet","bounds":[[32.57690621187388,-98.56658935546875],[33.89321737944089,-95.03311157226561]],"center":"[33.237538907121575, -96.79985046386719]","zoom":10,"updated_at":"2018-11-12 17:50:34 UTC","layers":[{"options":{"visible":true,"type":"Tiled","urlTemplate":"https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png","urlTemplate2x":"https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png","subdomains":"abcd","minZoom":"0","maxZoom":"18","name":"Positron (labels below)","className":"httpssbasemapscartocdncomrastertileslight_allzxypng","attribution":"\u0026copy; \u003ca href=\"http://www.openstreetmap.org/copyright\"\u003eOpenStreetMap\u003c/a\u003e contributors","id":"06523ca3-1274-4e99-95ac-327b0a4b2e53","order":0},"infowindow":null,"tooltip":null,"id":"06523ca3-1274-4e99-95ac-327b0a4b2e53","order":0,"type":"tiled"},{"type":"layergroup","options":{"user_name":"elenaran","maps_api_template":"https://{user}.carto.com:443","sql_api_template":"https://{user}.carto.com:443","tiler_protocol":"https","tiler_domain":"carto.com","tiler_port":"443","sql_api_protocol":"https","sql_api_domain":"carto.com","sql_api_endpoint":"/api/v2/sql","sql_api_port":443,"filter":"mapnik","layer_definition":{"stat_tag":"59813fd8-0f94-11e5-a5b5-0e9d821ea90d","version":"1.0.1","layers":[{"id":"45bbf2bf-809e-499f-9ea2-192c73f62db5","type":"CartoDB","infowindow":{"fields":[{"name":"title","title":true,"position":0},{"name":"class","title":true,"position":1},{"name":"fb_conf","title":true,"position":2},{"name":"fb","title":true,"position":3},{"name":"enroll","title":true,"position":4}],"template_name":"table/views/infowindow_light","template":"\u003cdiv class=\"cartodb-popup v2\"\u003e\n  \u003ca href=\"#close\" class=\"cartodb-popup-close-button close\"\u003ex\u003c/a\u003e\n  \u003cdiv class=\"cartodb-popup-content-wrapper\"\u003e\n    \u003cdiv class=\"cartodb-popup-content\"\u003e\n      {{#content.fields}}\n        {{#title}}\u003ch4\u003e{{title}}\u003c/h4\u003e{{/title}}\n        {{#value}}\n          \u003cp {{#type}}class=\"{{ type }}\"{{/type}}\u003e{{{ value }}}\u003c/p\u003e\n        {{/value}}\n        {{^value}}\n          \u003cp class=\"empty\"\u003enull\u003c/p\u003e\n        {{/value}}\n      {{/content.fields}}\n    \u003c/div\u003e\n  \u003c/div\u003e\n  \u003cdiv class=\"cartodb-popup-tip-container\"\u003e\u003c/div\u003e\n\u003c/div\u003e\n","alternative_names":{},"width":226,"maxHeight":180},"tooltip":{"fields":[],"template_name":"tooltip_light","template":"\u003cdiv class=\"cartodb-tooltip-content-wrapper\"\u003e\n  \u003cdiv class=\"cartodb-tooltip-content\"\u003e\n  {{#fields}}\n    {{#title}}\n    \u003ch4\u003e{{title}}\u003c/h4\u003e\n    {{/title}}\n    \u003cp\u003e{{{ value }}}\u003c/p\u003e\n  {{/fields}}\n  \u003c/div\u003e\n\u003c/div\u003e","alternative_names":{},"maxHeight":180},"legend":{"type":"none","show_title":false,"title":"","template":"","visible":true},"order":2,"visible":true,"options":{"layer_name":"schools","cartocss":"/** simple visualization */\n\n#schools2018{\n  marker-file: url(http://com.cartodb.users-assets.production.s3.amazonaws.com/maki-icons/square-18.svg);\n  marker-fill-opacity: 0.9;\n  marker-line-color: #012700;\n  marker-line-width: 1.5;\n  marker-line-opacity: 1;\n  marker-placement: point;\n  marker-type: ellipse;\n  marker-width: 14;\n  marker-fill: #012700;\n  marker-allow-overlap: true;\n}","cartocss_version":"2.1.1","interactivity":"cartodb_id","sql":"select * from schools","table_name":"\"\"."}}]},"attribution":""}}],"overlays":[{"type":"share","order":1,"options":{"display":true,"x":20,"y":20},"template":""},{"type":"search","order":2,"options":{"display":true,"x":60,"y":20},"template":""},{"type":"zoom","order":3,"options":{"display":true,"x":20,"y":20},"template":"\u003ca href=\"#zoom_in\" class=\"zoom_in\"\u003e+\u003c/a\u003e \u003ca href=\"#zoom_out\" class=\"zoom_out\"\u003e-\u003c/a\u003e"},{"type":"loader","order":4,"options":{"display":true,"x":20,"y":150},"template":"\u003cdiv class=\"loader\" original-title=\"\"\u003e\u003c/div\u003e"},{"type":"logo","order":5,"options":{"display":true,"x":10,"y":40},"template":""}],"prev":null,"next":null,"transition_options":{"time":0}};



$(function(){
    $("#output, #pop_table, #legend").draggable({ scroll: false });
});

$(document).ready(function(){
    // Toggle charts with ARIA state management
    try { $('#expandbtn').attr({ 'aria-controls': 'charts', 'aria-expanded': 'false' }); } catch(e){}
    $('#expandbtn').click(function(){
        var isOpen = $('#charts').is(':visible');
        $('#charts').slideToggle('slow');
        try {
            $('#expandbtn').val(isOpen ? 'Show Historical Playoff Metrics' : 'Hide Historical Playoff Metrics')
                           .attr('aria-expanded', (!isOpen).toString());
        } catch(e){}
    });
    $(".scrollable").mCustomScrollbar();
    // Parity: right-click any panel to hide it until next Calculate
    $('#output, #legend, #pop_table').on('contextmenu', function(e){
        e.preventDefault();
        try { $(this).hide(); } catch(err) {}
        return false;
    });
});

// ----- Shareable URL State Helpers -----
function parseStateFromQuery() {
    var q = location.search.replace(/^\?/, '');
    if (!q) return null;
    var p = {};
    q.split('&').forEach(function(kv){
        var i = kv.indexOf('=');
        if (i === -1) return;
        var k = decodeURIComponent(kv.slice(0,i));
        var v = decodeURIComponent(kv.slice(i+1));
        p[k] = v;
    });
    // Normalize types
    if (p.s1) p.s1 = String(p.s1);
    if (p.s2) p.s2 = String(p.s2);
    ['six','new','prior'].forEach(function(k){ if (p[k] != null) p[k] = (p[k] === '1' || p[k] === 'true'); });
    ['round','capI0','capI1','ymin','ymax'].forEach(function(k){ if (p[k] != null && p[k] !== '') p[k] = Number(p[k]); });
    return p;
}

function getYearFilterRange() {
    try {
        if (typeof playoffyearChart !== 'undefined' && playoffyearChart && typeof playoffyearChart.filters === 'function') {
            var yf = playoffyearChart.filters();
            if (yf && yf.length) { var r = yf[0]; if (Array.isArray(r)) { return { ymin: r[0], ymax: r[1] }; } }
        }
    } catch(e){}
    return null;
}

function buildStateFromUI() {
    var s = {};
    try {
        var $s1 = $('#School1 :selected');
        var $s2 = $('#School2 :selected');
        s.s1 = ($s1.attr('fid') || $s1.data('fid') || '') + '';
        s.s2 = ($s2.attr('fid') || $s2.data('fid') || '') + '';
        s.cls = document.forms[0].Classification.value || '';
        s.round = document.forms[0].Round.selectedIndex || 0;
        // Slider pip indexes (more stable with our query builder)
        var vals = ($('#slider-range').slider && $('#slider-range').slider('values')) || [0,100];
        s.capI0 = vals[0];
        s.capI1 = vals[1];
        s.six = !!(document.forms[0].sixmanfield && document.forms[0].sixmanfield.checked);
        s.new = !!(document.forms[0].newlybuilt && document.forms[0].newlybuilt.checked);
        s.prior = !!(document.forms[0].prioruse && document.forms[0].prioruse.checked);
        // Year range if applied
        var yr = getYearFilterRange();
        if (yr) { s.ymin = yr.ymin; s.ymax = yr.ymax; }
    } catch(e){}
    return s;
}

function encodeStateToQuery(s) {
    var parts = [];
    function add(k,v){ if(v!=null && v!=='') parts.push(encodeURIComponent(k)+'='+encodeURIComponent(String(v))); }
    add('s1', s.s1); add('s2', s.s2); add('cls', s.cls); add('round', s.round);
    add('capI0', s.capI0); add('capI1', s.capI1);
    add('six', s.six ? 1 : 0); add('new', s.new ? 1 : 0); add('prior', s.prior ? 1 : 0);
    if (s.ymin != null && s.ymax != null) { add('ymin', s.ymin); add('ymax', s.ymax); }
    return parts.length ? ('?'+parts.join('&')) : '';
}

function updateShareURL() {
    try {
        var s = buildStateFromUI();
        var qs = encodeStateToQuery(s);
        if (history && history.replaceState) {
            history.replaceState(null, document.title, location.pathname + qs + location.hash);
        } else {
            // Fallback: assign
            location.search = qs;
        }
    } catch(e) { debugLog('[share] updateShareURL failed', e); }
}

function setSelectByFid(sel, fid) {
    if (!fid) return;
    var $sel = $(sel);
    var found = false;
    $sel.find('option').each(function(){
        var a = this.getAttribute('fid') || (this.getAttribute && this.getAttribute('data-fid')) || '';
        if (String(a) === String(fid)) { this.selected = true; found = true; return false; }
    });
    if (!found) debugLog('[share] could not set select', sel, 'to fid', fid);
}

function applyStateToUI(p) {
    try {
        if (p.cls) { $('#Classification').val(p.cls); }
        if (typeof p.round === 'number') { $('#Round')[0].selectedIndex = p.round; }
        if (typeof p.capI0 === 'number' && typeof p.capI1 === 'number' && $('#slider-range').slider) {
            try { $('#slider-range').slider('values', [p.capI0, p.capI1]); } catch(e){}
        }
        if (p.six != null && document.forms[0].sixmanfield) document.forms[0].sixmanfield.checked = !!p.six;
        if (p.new != null && document.forms[0].newlybuilt) document.forms[0].newlybuilt.checked = !!p.new;
        if (p.prior != null && document.forms[0].prioruse) document.forms[0].prioruse.checked = !!p.prior;
    } catch(e) { debugLog('[share] applyStateToUI fields failed', e); }
}

function applyYearFilterFromState(p) {
    try {
        if (p && p.ymin != null && p.ymax != null && typeof playoffyearChart !== 'undefined' && playoffyearChart && typeof playoffyearChart.filterRange === 'function') {
            playoffyearChart.filterRange([p.ymin, p.ymax]);
            if (typeof dc !== 'undefined' && dc && typeof dc.redrawAll === 'function') dc.redrawAll();
        }
    } catch(e) { debugLog('[share] applyYearFilter failed', e); }
}

function applyStateFromURLIfPresent() {
    try {
        _URL_STATE = parseStateFromQuery();
        if (!_URL_STATE) return;
        // Wait for schools list populated before selecting by FID
        $.when(SCHOOLS_LOADED).done(function(){
            setSelectByFid('#School1', _URL_STATE.s1);
            setSelectByFid('#School2', _URL_STATE.s2);
            applyStateToUI(_URL_STATE);
            applyYearFilterFromState(_URL_STATE);
            // Auto-run if both ids present
            if (_URL_STATE.s1 && _URL_STATE.s2) {
                try { findCity(); } catch(e) { debugLog('[share] autorun findCity failed', e); }
            }
        });
    } catch(e) { debugLog('[share] applyStateFromURLIfPresent error', e); }
}

function initialize() {
    debugLog('[init] initialize start');
    // Hide results/output panel until user runs a calculation
    try { $('#output').hide(); } catch(e) {}
    if (screen.width < 1000 && $.fn.slideReveal) {
        // Click any link inside the sidepanel content to auto-hide (legacy parity) — exclude handle links
        $("#sidepanel a").on('click', function(){
            try { $("#menu-bar").slideReveal("hide"); } catch(e){}
        });
        slider = $("#menu-bar").slideReveal({
            width: 374,
            push: false,
            position: "right",
            trigger: $(".handle"),
            // When shown/hidden: keep the handle text stationary; switch the sidetab icon by toggling opener/closer class
            shown: function(){
                try {
                    // Match top Adjust Settings panel: swap to closer background sprite
                    $('#open2').removeClass('opener').addClass('closer');
                } catch(e){}
            },
            hidden: function(){
                try {
                    $('#open2').removeClass('closer').addClass('opener');
                } catch(e){}
            }
        });
        // Ensure initial state reflects hidden panel: plus/open icon; keep text stationary
        try { $('#open2').removeClass('closer').addClass('opener'); } catch(e){}
        // Prevent double-trigger: anchor inside handle toggles panel and stops propagation
        $("#menu-bar .handle a").on('click', function(e){
            e.preventDefault();
            e.stopPropagation();
            try { slider.slideReveal("toggle"); } catch(err){}
        });
        $('#pop_table').detach().appendTo('#sidepanel');
        $('#output').detach().appendTo('#sidepanel');
        $('#legend').detach().appendTo('#sidepanel');
    }
    // Initialize map
    map = new L.Map('map_canvas', {
        zoomControl: false,
        center: [32.24, -99.46],
        zoom: 6
    });
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYmNoYXN0YWluIiwiYSI6IjZZaWVZcXcifQ.Hj7VWUW-4oo5Ijx_-2pXXg', {
        attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>',
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1IjoiYmNoYXN0YWluIiwiYSI6IjZZaWVZcXcifQ.Hj7VWUW-4oo5Ijx_-2pXXg'
    }).addTo(map);
    debugLog('[init] basemap added');

    // Populate schools from AGOL (ordered by title)
    (function populateSchools() {
        var f = AGOL_CONFIG.schools.fields;
        var url = AGOL_CONFIG.schools.url + '/query';
        var params = {
            where: '1=1',
            outFields: [f.school, f.class, f.fid].join(','),
            orderByFields: f.school,
            returnGeometry: false,
            f: 'pjson'
        };
        debugLog('[schools] GET', url, params);
        $.getJSON(url, params, function(resp) {
            debugLog('[schools] response', resp && resp.features ? resp.features.length + ' features' : 'no features');
            var rows = (resp.features || []).map(function(ft){
                var a = ft.attributes || {};
                return { school: a[f.school], class: a[f.class], fid: a[f.fid] };
            });
            rows.forEach(function(val){
                var x = (document.forms[0].School1.options[document.forms[0].School1.length] = new Option(val.school, val.school));
                x.setAttribute('class', val.class);
                x.setAttribute('fid', val.fid);
                var y = (document.forms[0].School2.options[document.forms[0].School2.length] = new Option(val.school, val.school));
                y.setAttribute('class', val.class);
                y.setAttribute('fid', val.fid);
            });
            debugLog('[schools] populated options:', rows.length);
            try { SCHOOLS_LOADED.resolve(); } catch(e){}
        }).fail(function(xhr, status, err){
            debugLog('[schools] ERROR', status, err, xhr && xhr.responseText);
            showError('Failed to load schools list.', err || status);
            try { SCHOOLS_LOADED.resolve(); } catch(e){}
        });
    })();
    new L.Control.Zoom({ position: 'bottomleft' }).addTo(map);
    L.control.scale({ position: 'bottomright' }).addTo(map);
    // Initialize charts (disabled until PCAP is configured), then restore URL state and setup selection UI
    chartSetup().then(function() {
        applyStateFromURLIfPresent();
        selectionSetup();
    });
    debugLog('[init] initialize complete');
}

function clearMap() {
    // remove any dynamic layers we added
    activeLayers.forEach(function(layer){
        try { map.removeLayer(layer); } catch(e) {}
    });
    activeLayers = [];
    stadiumMarkerByFid = {};
    if (oTable != null) {
        oTable.fnDestroy();
    }
    //Remove all the DOM elements
    $('#output2').empty();
    $('#pop_table2').empty();
    $('#legend2').empty();
    // Hide panels so their background containers don't linger after clearing
    try { $('#output').hide(); } catch(e){}
    try { $('#legend').hide(); } catch(e){}
    try { $('#pop_table').hide(); } catch(e){}
    $('#menu-bar').hide();
}

function openInfowindow(layer, latlng, title, owner, score, capacity, opened, sixmanfield, surface) {
    // Build inline label:value rows instead of stacked h4+p blocks; remove redundant custom close X
    var rows = [
        { label: 'Title', value: title || '' },
        { label: 'Owner', value: owner || '' },
        { label: 'Score', value: (score != null ? (score.toFixed ? score.toFixed(4) : score) : '') },
        { label: 'Capacity', value: capacity || '' },
        { label: 'Year Built', value: opened || '' },
        { label: 'Six-Man Field?', value: String(sixmanfield) }
    ];
    if (surface) {
        // Insert Surface row after Score
        rows.splice(3, 0, { label: 'Surface', value: surface });
    }
    var inner = rows.map(function(r){
        return '<div class="popup-row"><span class="popup-label">' + r.label + ':</span><span class="popup-value">' + r.value + '</span></div>';
    }).join('');
    var html = '<div class="cartodb-popup"><div class="cartodb-popup-content-wrapper"><div class="cartodb-popup-content">' + inner + '</div></div><div class="cartodb-popup-tip-container"></div></div>';
    L.popup({ maxWidth: 260, closeButton: true })
        .setLatLng(latlng)
        .setContent(html)
        .openOn(map);
}


// Ensure CSS for school square markers is present
function ensureSchoolMarkerCSS() {
    if (document.getElementById('school-marker-style')) return;
    var css = '\n' +
            '.school-marker{pointer-events:auto;}\n' +
      '.school-marker .school-square{width:13px;height:13px;background:#012700;border:0;border-radius:2px;box-shadow:0;transform:translate(-50%,-50%);}\n';
    var style = document.createElement('style');
    style.id = 'school-marker-style';
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
}

// Add selected schools as small green square markers
function addSelectedSchoolMarkers(fid1, fid2) {
    try { debugLog('[schools] add markers for fids:', fid1, fid2); } catch(e){}
    ensureSchoolMarkerCSS();
    var f = AGOL_CONFIG.schools.fields;
    var url = AGOL_CONFIG.schools.url + '/query';
    var where = f.fid + ' IN (' + Number(fid1) + ',' + Number(fid2) + ')';
    var params = {
        where: where,
        // fetch all attributes so we can populate school popup with original fields (fb_conf, fb, enroll) when available
        outFields: '*',
        returnGeometry: true,
        outSR: 4326,
        f: 'json'
    };
    $.getJSON(url, params, function(resp){
        var feats = (resp && resp.features) ? resp.features : [];
        debugLog('[schools] marker query resp features:', feats.length);
        if (!feats.length) return;
        feats.forEach(function(ft){
            if (!ft.geometry) return;
            var latlng = L.latLng(ft.geometry.y, ft.geometry.x);
            var icon = L.divIcon({
                className: 'school-marker',
                html: '<div class="school-square"></div>',
                iconSize: [0, 0]
            });
            var m = L.marker(latlng, { icon: icon, keyboard: false, zIndexOffset: 1000, interactive: true }).addTo(map);
            // Attach popup on click using Carto-like infowindow style/contents
            m.on('click', function(){ openSchoolInfowindow(latlng, ft.attributes || {}); });
            activeLayers.push(m);
        });
    }).fail(function(xhr, status, err){
        debugLog('[schools] marker query ERROR', status, err, xhr && xhr.responseText);
    });
}

// Open school popup with Carto-like template and original fields (title, class, fb_conf, fb, enroll)
function openSchoolInfowindow(latlng, attrs){
    try {
        var f = AGOL_CONFIG.schools && AGOL_CONFIG.schools.fields ? AGOL_CONFIG.schools.fields : { school: 'school', class: 'class' };
        function valOrNull(v){ return (v === null || v === undefined || v === '') ? null : v; }
        var titleVal = valOrNull(attrs[f.school]);
        var classVal = valOrNull(attrs[f.class]);

        // Build inline rows to match stadium popup style; only Title and Class (UIL source lacks enrollment)
        var rows = [];
        rows.push({ label: 'Title', value: titleVal || '' });
        rows.push({ label: 'Class', value: classVal || '' });
        var inner = rows.map(function(r){
            return '<div class="popup-row"><span class="popup-label">' + r.label + ':</span><span class="popup-value">' + r.value + '</span></div>';
        }).join('');

        var html = '' +
            '<div class="cartodb-popup v2">' +
            '  <div class="cartodb-popup-content-wrapper">' +
            '    <div class="cartodb-popup-content">' + inner + '</div>' +
            '  </div>' +
            '  <div class="cartodb-popup-tip-container"></div>' +
            '</div>';
        L.popup({ maxWidth: 260, closeButton: true })
            .setLatLng(latlng)
            .setContent(html)
            .openOn(map);
    } catch(e){ debugLog('[schools] openSchoolInfowindow error', e); }
}


function findCity() {
    debugLog('[calc] findCity triggered');
    //set to the active element in the combobox
    var which1 = document.forms[0].School1.value;
    var which2 = document.forms[0].School2.value;
    debugLog('[calc] schools selected:', which1, which2);

    // Fallback logging even if debug disabled so user always sees at least one line
    // Minimal banner already shown; suppress noisy calculate log unless debug
    if (DEBUG) { try { console.log('[playoff] Calculate clicked: School1="' + which1 + '" School2="' + which2 + '"'); } catch(e){} }

    // Helper to get FID attribute robustly
    function getSelectedFid(sel){
        var $opt = $(sel + ' :selected');
        if (!$opt.length) return null;
        var fid = $opt.attr('fid') || $opt.data('fid');
        // Some services may have lowercase 'fid' field name; attempt attribute map
        if (!fid) {
            // Try to detect by scanning option attributes
            $.each($opt[0].attributes, function(_, attr){
                if (/^fid$/i.test(attr.name)) { fid = attr.value; return false; }
            });
        }
        return fid;
    }
    var fid1 = getSelectedFid('#School1');
    var fid2 = getSelectedFid('#School2');
    if ((which1 && !fid1) || (which2 && !fid2)) {
        showError('Selected school is missing its FID attribute.', 'Verify the schools layer has a FID field and AGOL_CONFIG.schools.fields.fid matches its exact name (case-sensitive).');
        try { console.warn('[playoff] Missing FID(s):', { fid1: fid1, fid2: fid2 }); } catch(e){}
        return;
    }
    // Validate numeric FIDs (OD matrices expect numeric OriginOID/DestinationOID)
    var numFid1 = parseInt(fid1, 10);
    var numFid2 = parseInt(fid2, 10);
    if (isNaN(numFid1) || isNaN(numFid2)) {
        showError('School FID values are not numeric.', 'Raw FID1=' + fid1 + ' FID2=' + fid2 + '. If your schools layer uses OBJECTID or another field, set AGOL_CONFIG.schools.fields.fid accordingly.');
        try { console.warn('[playoff] Non-numeric FID(s):', { fid1: fid1, fid2: fid2 }); } catch(e){}
        return;
    }
    debugLog('[playoff] Using numeric FIDs', numFid1, numFid2);

    //if both comboboxes have been selected, continue
    if (which1 != "" && which2 != "") {
    $("div#panel").slideUp("slow");
        $("#toggle a").toggle();
    $(".loader").show();
    try { $('body').attr('aria-busy','true'); } catch(e){}

        $('#output2').empty();
        $('#pop_table2').empty();
        $('#legend2').empty();
        var plusRE = /\+/;
        which1 = which1.replace(plusRE, '\\u002b');
        which2 = which2.replace(plusRE, '\\u002b');
        var quoteRE = /'/;
        which1 = which1.replace(quoteRE, '\'\'');
        which2 = which2.replace(quoteRE, '\'\'');
        // Clear any previous overlays
    clearMap();


                                var opts = {
                            where: '(OriginOID=' + numFid1 + ' AND DestinationOID=' + numFid2 + ') OR (OriginOID=' + numFid2 + ' AND DestinationOID=' + numFid1 + ')',
          outFields: "OriginOID, DestinationOID, Total_Time",
          returnGeometry: false,
            f: 'json'
        }
        debugLog('[calc] OD S->S where:', opts.where);

                
            $.getJSON("https://services2.arcgis.com/VNo0ht0YPXJoI4oE/arcgis/rest/services/OD_Schools_to_Schools/FeatureServer/0/query", opts, function(results) {
                    debugLog('[calc] OD S->S resp features:', results && results.features ? results.features.length : 0);
                    try {
                        if (!results || !results.features || results.features.length < 2) {
                                showError('Could not compute baseline travel time between the two schools.', 'OD Schools->Schools returned insufficient results.');
                                return;
                        }
                        var betweenSchools = results.features[1].attributes.Total_Time;
                        if (results.features[0].attributes.Total_Time < results.features[1].attributes.Total_Time) {
                            betweenSchools = results.features[0].attributes.Total_Time;
                        }
                        debugLog('[calc] betweenSchools:', betweenSchools);
                        debugLog('[playoff] baseline school-to-school minutes:', betweenSchools);
                        // Add selected school markers on the map
                        addSelectedSchoolMarkers(numFid1, numFid2);
                        
                    } catch(e) {
                        showError('Error processing school-to-school times.', e.message || String(e));
                        return;
                    }

          opts.where = 'OriginOID=' + numFid1 + ' OR OriginOID=' + numFid2;
          debugLog('[playoff] OD S->Stadiums where:', opts.where);
          // Remove orderByFields to avoid server-side sort overhead; we don't need it
          delete opts.orderByFields;
          var stadiums = [];

                                            
                        var odUrl = "https://services2.arcgis.com/VNo0ht0YPXJoI4oE/arcgis/rest/services/OD_Schools_to_Stadiums/FeatureServer/0/query";
                                            var odParams = {
                                                    where: opts.where,
                                                    returnGeometry: false,
                                                    outFields: 'OriginOID, DestinationOID, Total_Time',
                                                    returnExceededLimitFeatures: true,
                                                    resultRecordCount: 2000
                                            };
                        debugLog('[calc] OD S->Stadiums where:', odParams.where);
                                            queryAllFeatures(odUrl, odParams).done(function(features){
            debugLog('[calc] OD S->Stadiums resp total:', features ? features.length : 0);
                        try {
                            if (features && features.length) {
                                var sample = features[0].attributes || {};
                                debugLog('[playoff] sample OD feature keys:', Object.keys(sample));
                            } else {
                                debugLog('[playoff] OD S->Stadiums returned 0 features');
                            }
                        } catch(e){}
                        try {
                                                    if (!features || !features.length) {
                                    showError('No travel times returned for schools to stadiums.', 'OD Schools->Stadiums returned 0 features.');
                                    return;
                            }
                                                    
                            // Collect times per DestinationOID, expect two origins
                            var timesByDest = {};
                            // Support case-insensitive DestinationOID field name
                            features.forEach(function (ft) {
                                var a = ft.attributes || {};
                                var d = a.DestinationOID;
                                if (d == null) {
                                    var dk = Object.keys(a).find(function(k){ return k.toLowerCase() === 'destinationoid'; });
                                    if (dk) d = a[dk];
                                }
                                if (d == null) return; // skip if cannot resolve destination id
                                if (!timesByDest[d]) timesByDest[d] = [];
                                timesByDest[d].push(a.Total_Time);
                            });
                            debugLog('[playoff] unique stadium destination count:', Object.keys(timesByDest).length);
                                                    
                            // Compute scores keyed by DestinationOID
                            Object.keys(timesByDest).forEach(function(d){
                                var t = timesByDest[d];
                                if (t.length >= 2) {
                                    var t1 = t[0], t2 = t[1];
                                    var score = (t1 / t2) * Math.pow(t1 + t2, 3) / Math.pow(betweenSchools, 3);
                                    if (t1 < t2) {
                                        score = (t2 / t1) * Math.pow(t1 + t2, 3) / Math.pow(betweenSchools, 3);
                                    }
                                    stadiums.push({ DestinationOID: Number(d), score: score });
                                }
                            });
                            debugLog('[playoff] stadiums with score (by id):', stadiums.length);
                            if (!stadiums.length) {
                                    showError('Could not compute fairness scores for any stadiums.', 'OD Schools->Stadiums times were incomplete.');
                                    return;
                            }
                            
                        } catch(e) {
                            
                            showError('Error processing school-to-stadium times.', e.message || String(e));
                            return;
                        }



            // Build AGOL Stadiums where clause based on UI filters
            var f = AGOL_CONFIG.stadiums.fields;
            var whereParts = [];
            // Capacity slider values (read by index and map to pip labels)
            var sliderVals = ($("#slider-range").slider && $("#slider-range").slider("values")) || [0, 100];
            var labels = $('.ui-slider-label');
            var capMin, capMax;
            if (labels && labels.length) {
                capMin = parseInt(labels.eq(sliderVals[0]).text().replace(/,/g, ''));
                capMax = parseInt(labels.eq(sliderVals[1]).text().replace(/,/g, ''));
            } else {
                capMin = 0; capMax = 102000;
            }
            
            whereParts.push(f.capacity + '>=' + capMin);
            whereParts.push(f.capacity + '<=' + capMax);
            // Newly built (last 10 years)
            if (document.forms[0].newlybuilt.checked) {
                var curdate = new Date();
                var curyear = parseInt(curdate.getFullYear());
                whereParts.push(f.opened + '>' + (curyear - 10));
            }
            // Six-man field only (layer stores as integer flag 1/0)
            if (document.forms[0].sixmanfield && document.forms[0].sixmanfield.checked) {
                whereParts.push('(' + f.sixmanfield + ' = 1)');
            }
            var stadParams = {
                where: whereParts.length ? whereParts.join(' AND ') : '1=1',
                outFields: '*',
                returnGeometry: true,
                outSR: 4326,
                f: 'json'
            };
            var stadUrl = AGOL_CONFIG.stadiums.url + '/query';
            debugLog('[stadiums] GET', stadUrl, stadParams);
                        
                        $.getJSON(stadUrl, stadParams, function(fcResp) {
                            debugLog('[stadiums] resp features:', fcResp && fcResp.features ? fcResp.features.length : 0);
                            var rows = (fcResp && fcResp.features) ? fcResp.features : [];
                            try {
                                if (rows.length) {
                                    debugLog('[playoff] sample stadium feature keys:', Object.keys(rows[0].attributes||{}));
                                } else {
                                    debugLog('[playoff] stadium query returned 0 features for where:', stadParams.where);
                                }
                            } catch(e){}
                            if (!rows.length) {
                                    showError('No stadiums matched your filters.', 'Try widening capacity range or unchecking filters.');
                                    return;
                            }
              // Join OD scores to stadium features by FID
              var byDest = {};
              stadiums.forEach(function(s){ byDest[s.DestinationOID] = s.score; });
                            rows.forEach(function(ft){
                                var a = ft.attributes || {};
                                // Resolve stadium identifier (case-insensitive)
                                var sid = a[f.fid];
                                if (sid == null) {
                                    var altKey = Object.keys(a).find(function(k){ return k.toLowerCase() === f.fid.toLowerCase(); });
                                    if (altKey) sid = a[altKey];
                                }
                                a.score = byDest[sid];
                                if (typeof a.score !== 'number') {
                                    debugLog('[stadiums] no score for stadium id', sid);
                                }
                                // store geometry lat/lng fallback for table links
                                if (ft.geometry) {
                                        a._lng = ft.geometry.x;
                                        a._lat = ft.geometry.y;
                                }
                            });
                            debugLog('[playoff] stadiums with matched scores count:', rows.filter(function(r){ return typeof r.attributes.score === 'number'; }).length);
              // Optionally filter by prior-use (prefer PCAP if available; else fall back to feature count fields)
              if (document.forms[0].prioruse.checked && document.forms[0].Classification.value) {
                  var clsSelFilter = document.forms[0].Classification.value;
                  var roundIdxFilter = document.forms[0].Round ? document.forms[0].Round.selectedIndex : 0;
                  if (_PCAP_ROWS && AGOL_CONFIG.pcap && AGOL_CONFIG.pcap.url) {
                      var setsF = computePcapPriorUseSets(clsSelFilter, roundIdxFilter);
                      if (setsF) {
                          rows = rows.filter(function(ft){
                              var a = ft.attributes || {};
                              var sidF = a[f.fid];
                              if (sidF == null) {
                                  var altKeyF = Object.keys(a).find(function(k){ return k.toLowerCase() === f.fid.toLowerCase(); });
                                  if (altKeyF) sidF = a[altKeyF];
                              }
                              return (sidF != null) && setsF.inClass.has(Number(sidF));
                          });
                      }
                  } else {
                      // Fallback: use static feature count fields if present
                      var cls = clsSelFilter.toLowerCase();
                      var countFieldLC = 'count' + cls;
                      var hasCount = rows.some(function(ft){
                          var a = ft.attributes || {};
                          return Object.keys(a).some(function(k){ return k && k.toLowerCase() === countFieldLC; });
                      });
                      if (hasCount) {
                          rows = rows.filter(function(ft){
                              var a = ft.attributes || {};
                              var key = Object.keys(a).find(function(k){ return k && k.toLowerCase() === countFieldLC; });
                              return key ? (a[key] && Number(a[key]) > 0) : false;
                          });
                      }
                  }
              }
              // Sort by score asc, top 50
              rows = rows.filter(function(ft){ return typeof (ft.attributes||{}).score === 'number' && isFinite(ft.attributes.score); })
                         .sort(function(a,b){ return a.attributes.score - b.attributes.score; })
                         .slice(0,50);
              if (!rows.length) {
                  showError('No stadiums produced a valid score after filtering.', 'You may have extremely restrictive filters.');
                  return;
              }

                              // Compute ckmeans buckets for marker sizes (lower score = larger bubble)
                              var baseSizesAsc = [5.2, 7.1, 12.2, 17.3, 22.4];
                              var scores = rows.map(function(ft){ return ft.attributes.score; });
                              var breaks;
                              if (scores.length > 5) {
                                  try {
                                      var clusters = ss.ckmeans(scores, 5);
                                      // Use the max of each cluster as ascending thresholds
                                      breaks = clusters.map(function(cluster){ return cluster[cluster.length-1]; });
                                  } catch(e) {
                                      breaks = scores.slice().sort(function(a,b){return a-b;});
                                  }
                              } else {
                                  breaks = scores.slice().sort(function(a,b){return a-b;});
                              }
                              // Map smaller thresholds to larger sizes (reverse size order)
                              var sizesDesc = baseSizesAsc.slice().reverse();
                              function sizeFor(score){
                                  for (var i=0;i<breaks.length;i++){
                                      if (score <= breaks[i]) return sizesDesc[i] || sizesDesc[sizesDesc.length-1];
                                  }
                                  return sizesDesc[sizesDesc.length-1];
                              }
              // Build GeoJSON and render
              var gj = {
                  type: 'FeatureCollection',
                  features: rows.map(function(ft){
                      var a = ft.attributes || {};
                      var g = ft.geometry || {};
                      return {
                          type: 'Feature',
                          geometry: { type: 'Point', coordinates: [g.x, g.y] },
                          properties: a
                      };
                  })
              };
              var stadLayer = L.geoJSON(gj, {
                  pointToLayer: function(feature, latlng){
                      var a = feature.properties || {};
                      var s = sizeFor(a.score);
                      // Default color blue; override if prior-use counts exist
                      var fill = '#0000FF';
                      var clsSel = document.forms[0].Classification.value;
                      var selIdx = document.forms[0].Round.selectedIndex;
                      // Prefer PCAP-driven dynamic prior-use if available; fallback to feature counts otherwise
                      if (_PCAP_ROWS && AGOL_CONFIG.pcap && AGOL_CONFIG.pcap.url) {
                          var sid = a[AGOL_CONFIG.stadiums.fields.fid];
                          if (sid == null) {
                              var altKey = Object.keys(a).find(function(k){ return k.toLowerCase() === AGOL_CONFIG.stadiums.fields.fid.toLowerCase(); });
                              if (altKey) sid = a[altKey];
                          }
                          var sets = computePcapPriorUseSets(clsSel, selIdx);
                          if (sets) {
                              if (sid != null && sets.inClass.has(Number(sid))) fill = '#FF5C00';
                              if (selIdx > 0 && sid != null && sets.inClassRound.has(Number(sid))) fill = '#FFFF00';
                          }
                      } else if (clsSel) {
                          var clsKey = Object.keys(a).find(function(k){ return k && k.toLowerCase() === ('count' + clsSel.toLowerCase()); });
                          if (clsKey && Number(a[clsKey]) > 0) {
                              fill = '#FF5C00';
                              if (selIdx > 0) {
                                  for (var r = 0; r < document.forms[0].Round.length; r++) {
                                      if (r >= selIdx) {
                                          var rk = document.forms[0].Round[r].value.toLowerCase();
                                          var roundKey = Object.keys(a).find(function(k){ return k && k.toLowerCase() === ('count' + clsSel.toLowerCase() + rk); });
                                          if (roundKey && Number(a[roundKey]) > 0) { fill = '#FFFF00'; break; }
                                      }
                                  }
                              }
                          }
                      }
                      var marker = L.circleMarker(latlng, { radius: s, color: '#FFF', weight: 1.5, fillColor: fill, fillOpacity: 0.9 });
                      // Cache marker by stadium fid for hover highlighting
                      var sidStore = a[AGOL_CONFIG.stadiums.fields.fid];
                      if (sidStore == null) {
                          var altKey2 = Object.keys(a).find(function(k){ return k.toLowerCase() === AGOL_CONFIG.stadiums.fields.fid.toLowerCase(); });
                          if (altKey2) sidStore = a[altKey2];
                      }
                      if (sidStore != null) {
                          stadiumMarkerByFid[Number(sidStore)] = marker;
                      }
                      return marker;
                  },
                  onEachFeature: function(feature, layer){
                      // Attach click to open popup
                      layer.on('click', function(){
                          var a = feature.properties || {};
                          var surface = (a.surface != null ? a.surface : (a.playing_su != null ? a.playing_su : (a.playingsu != null ? a.playingsu : '')));
                          openInfowindow(layer, layer.getLatLng(), a[f.title], a[f.owner], a.score, a[f.capacity], a[f.opened], a[f.sixmanfield], surface);
                      });
                  }
              }).addTo(map);
              activeLayers.push(stadLayer);
              debugLog('[playoff] markers added to map (count):', rows.length);
              debugLog('[map] added markers:', rows.length);
              try {
                  map.fitBounds(stadLayer.getBounds());
                  debugLog('[map] fitBounds ok');
              } catch(e) {}
              // Build results table
              var joined = rows.map(function(ft){ return ft.attributes; });
              var outtable = "";
              // Legacy behavior: only the table (no export/search header)
              outtable += "<table  id=\"outtable\" class=\"display compact\" cellspacing=\"0\" width=\"100%\">";
              outtable += "<thead><tr><th>Name</th><th>Prior-Use</th><th>Year Built</th><th>Capacity</th><th>Score</th></tr></thead>";
              outtable += "<tbody>";
              var setsForTable = null;
              var clsSelTbl = document.forms[0].Classification.value;
              var roundIdxTbl = document.forms[0].Round.selectedIndex;
              if (_PCAP_ROWS && clsSelTbl) {
                  setsForTable = computePcapPriorUseSets(clsSelTbl, roundIdxTbl);
              }
              $.each(joined, function(key, val) {
                  var sidAttr = val[f.fid];
                  if (sidAttr == null) {
                      var altKey3 = Object.keys(val).find(function(k){ return k.toLowerCase() === f.fid.toLowerCase(); });
                      if (altKey3) sidAttr = val[altKey3];
                  }
                  outtable += (key % 2 == 0) ? '<tr class="even"' : '<tr class="odd"';
                  outtable += (sidAttr != null ? (' data-sid="' + sidAttr + '">') : '>' );
                  var surfaceVal = (val.surface != null ? val.surface : (val.playing_su != null ? val.playing_su : (val.playingsu != null ? val.playingsu : '')));
                  outtable += "<td><a href='#' class='link' title='" + val[f.title] + "' owner='" + val[f.owner] +
                              "' lat=" + (val[f.lat] || val._lat) + " lng=" + (val[f.lng] || val._lng) + " opened=" + val[f.opened] +
                              " score=" + val.score + " capacity=" + val[f.capacity] + " sixmanfield=" + val[f.sixmanfield] +
                              (surfaceVal ? (" surface='" + String(surfaceVal).replace(/'/g, "&#39;") + "'") : "") +
                              " sid='" + (sidAttr!=null? sidAttr: '') + "'>" + val[f.title] + "</a></td><td>";
                  var clsLower = document.forms[0].Classification.value.toLowerCase();
                  var countKey = Object.keys(val).find(function(k){ return k && k.toLowerCase() === ('count' + clsLower); });
                  var useCount = '';
                  // Prefer PCAP-derived count when available to keep table and popup consistent with marker coloring
                  if (typeof _PCAP_ROWS_FULL !== 'undefined' && _PCAP_ROWS_FULL && sidAttr != null && clsSelTbl) {
                      var yearMin = null, yearMax = null;
                      if (typeof playoffyearChart !== 'undefined' && playoffyearChart && typeof playoffyearChart.filters === 'function') {
                          var yf = playoffyearChart.filters();
                          if (yf && yf.length) { var r = yf[0]; if (Array.isArray(r)) { yearMin=r[0]; yearMax=r[1]; } }
                      }
                      var sidNum = Number(sidAttr);
                      var clsUp = clsSelTbl.toUpperCase();
                      var cnt = 0;
                      for (var i=0;i<_PCAP_ROWS_FULL.length;i++){
                          var ev = _PCAP_ROWS_FULL[i];
                          if (ev.stadium_fid !== sidNum) continue;
                          if (ev.class !== clsUp) continue;
                          if (yearMin!=null && yearMax!=null && (ev.year==null || ev.year<yearMin || ev.year>yearMax)) continue;
                          cnt++;
                      }
                      useCount = cnt || '';
                  } else if (countKey) {
                      useCount = Number(val[countKey]) || '';
                  }
                  var countHtml = (useCount!==''? ("<a href='#' class='prior-link' data-sid='" + (sidAttr||'') + "'>" + useCount + "</a>") : '');
                  outtable += countHtml + "</td><td>" + (val[f.opened] > 0 ? val[f.opened] : '') + "</td><td>" + val[f.capacity] + "</td><td>" + (val.score!=null? val.score.toFixed(4) : '') + "</td></tr>";
              });
              outtable += "</tbody></table>";
                            try {
                                var outEl = document.getElementById('output2');
                                outEl.innerHTML = outtable; // replace (legacy behavior)
                                $('#output').show(); // reveal panel now that results exist
                            } catch(e) { debugLog('[ui] failed to render table', e); }
                            $(".loader").hide();
                            try { $('body').attr('aria-busy','false'); } catch(e){}
              // Legend parity: replicate original Carto legend structure (category + bubble)
                            var legendHtml = '' +
                                '<div class="cartodb-legend category" style="display:block;" role="list" aria-label="Prior use categories">' +
                                '  <ul>' +
                                '    <li role="listitem"><div class="bullet" style="background:#FF0"></div> <span class="legend-label">Prior use in current class in current round or higher</span></li>' +
                                '    <li role="listitem"><div class="bullet" style="background:#FF5C00"></div> <span class="legend-label">Prior use in current class in any round</span></li>' +
                                '    <li role="listitem"><div class="bullet" style="background:#00F"></div> <span class="legend-label">No prior use</span></li>' +
                                '  </ul>' +
                                '</div>' +
                                '<div class="cartodb-legend bubble" style="display:block;" aria-label="Score bubble size legend">' +
                                '  <ul>' +
                                '    <li><span class="legend-scale-label" aria-hidden="true"> Less Ideal</span></li>' +
                                '    <li class="graph" aria-label="Bubble sizes represent index fairness score; lower score is more ideal"><div class="bubbles"></div></li>' +
                                '    <li><span class="legend-scale-label" aria-hidden="true"> More Ideal</span></li>' +
                                '  </ul>' +
                                '</div>';
                            $('#legend2').empty().append(legendHtml);
                            // Ensure legend is visible even if previously hidden via right-click
                            try { $('#legend').show(); } catch(e){}
                            // Update shareable URL to reflect current inputs for deep-linking
                            updateShareURL();
              // DataTable setup
              $(document).ready(function() {
                  try {
                      if ($.fn.dataTable) {
                          oTable = $('#outtable').dataTable({
                              "bJQueryUI": true,
                              "bProcessing": true,
                              "paging": false,
                              "ordering": false,
                              "searching": false,
                              "info": false
                          });
                      }
                  } catch(dtErr) { debugLog('[datatable] init failed', dtErr); }
                  // Hover highlight of map markers when moving over rows (retain)
                  function highlightMarker(fid){ fid = Number(fid); var m = stadiumMarkerByFid[fid]; if (m){ try{ m.setStyle({ weight:4 }); }catch(e){} } }
                  function resetMarker(fid){ fid = Number(fid); var m = stadiumMarkerByFid[fid]; if (m){ try{ m.setStyle({ weight:1.5 }); }catch(e){} } }
                  $('#outtable tbody').on('mouseenter', 'tr', function(){ var sid=$(this).data('sid'); if(sid!=null) highlightMarker(sid); })
                                        .on('mouseleave', 'tr', function(){ var sid=$(this).data('sid'); if(sid!=null) resetMarker(sid); });
                  // Prior-Use details popup when clicking the prior-use count
                  $('#outtable').on('click', 'a.prior-link', function(e){
                      e.preventDefault();
                      var sid = Number($(this).data('sid'));
                      if (!sid || typeof _PCAP_ROWS_FULL === 'undefined' || !_PCAP_ROWS_FULL) return false;
                      var clsSel = (document.forms[0].Classification.value||'').toUpperCase();
                      var yearMin = null, yearMax = null;
                      if (typeof playoffyearChart !== 'undefined' && playoffyearChart && typeof playoffyearChart.filters === 'function') {
                          var yf = playoffyearChart.filters();
                          if (yf && yf.length) { var r = yf[0]; if (Array.isArray(r)) { yearMin=r[0]; yearMax=r[1]; } }
                      }
                      var events = _PCAP_ROWS_FULL.filter(function(ev){
                          if (ev.stadium_fid !== sid) return false;
                          if (clsSel && ev.class !== clsSel) return false;
                          if (yearMin!=null && yearMax!=null) { if (ev.year==null || ev.year<yearMin || ev.year>yearMax) return false; }
                          return true;
                      }).sort(function(a,b){ return (a.year||0) - (b.year||0); });
                      var html = "<thead><tr><th>Location</th><th>Class</th><th>Round</th><th>Year</th></tr></thead><tbody>";
                      events.forEach(function(ev, idx){
                          html += '<tr class="' + (idx % 2 === 0 ? 'even' : 'odd') + '"><td>' + (ev.location||'') + '</td><td>' + (ev.class||'') + '</td><td>' + (ev.round||'') + '</td><td>' + (ev.year!=null? ev.year: '') + '</td></tr>';
                      });
                      html += "</tbody>";
                      $('#pop_table2').html(html);
                      $('#pop_table').show();
                      return false;
                  });
                  $(".scrollable").mCustomScrollbar();
                  if (screen.width < 1000) { $('#menu-bar').show(); }
              });
              // Link clicks open popup on corresponding feature
              if (stadLayer) {
                  $('.link').click(function() {
                      if(slider){ slider.slideReveal("hide"); }
                      openInfowindow(
                          stadLayer,
                          [parseFloat($(this).attr('lat')), parseFloat($(this).attr('lng'))],
                          $(this).attr('title'),
                          $(this).attr('owner'),
                          parseFloat($(this).attr('score')),
                          parseInt($(this).attr('capacity')),
                          parseInt($(this).attr('opened')),
                          $(this).attr('sixmanfield'),
                          $(this).attr('surface') || ''
                      );
                      return false;
                  });
              }
                        }).fail(function(xhr, status, err){
                                debugLog('[stadiums] ERROR', status, err, xhr && xhr.responseText);
                                showError('Failed querying Stadiums layer.', err || status);
                        });
                    }).fail(function(reason){
                                                            debugLog('[calc] OD S->Stadiums ERROR', reason);
                                                            showError('Failed querying travel times from schools to stadiums.', (reason && reason.message) || String(reason));
                    }).always(function(){
                                                        });
                }).fail(function(xhr, status, err){
                    debugLog('[calc] OD S->S ERROR', status, err, xhr && xhr.responseText);
                    showError('Failed querying travel times between schools.', err || status);
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
    var dfd = $.Deferred();
    try {
        $('#expandbtn').prop('disabled', true).val('Loading Historical Playoff Metrics…');
        $('#charts').hide();
        // ORIGINAL PARITY: Use PCAP events if available; else disable charts.
        if (!(AGOL_CONFIG.pcap && AGOL_CONFIG.pcap.url)) {
            $('#expandbtn').prop('disabled', true).val('Historical Playoff Metrics (no PCAP configured)');
            dfd.resolve();
            return dfd.promise();
        }
        // Dynamically load reductio if missing (for median/stddev aggregation parity)
        if (typeof reductio === 'undefined') {
            var script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/reductio/0.6.3/reductio.min.js';
            document.head.appendChild(script);
        }
        var pcapUrl = AGOL_CONFIG.pcap.url + '/query';
        var stadUrl = AGOL_CONFIG.stadiums.url + '/query';
        var stadParams = { where:'1=1', outFields:'fid,' + [AGOL_CONFIG.stadiums.fields.capacity, AGOL_CONFIG.stadiums.fields.opened].join(','), returnGeometry:false, f:'json', resultRecordCount:2000 };
        var pcapParams = { where:'1=1', outFields:'ID,Class,Division,Round,Location,Year,stadium_fid', returnGeometry:false, f:'json', resultRecordCount:20000 };
        $.when(queryAllFeatures(stadUrl, stadParams), queryAllFeatures(pcapUrl, pcapParams)).done(function(stadFeats, pcapFeats){
            stadFeats = stadFeats || []; pcapFeats = pcapFeats || [];
            if (!pcapFeats.length) {
                $('#expandbtn').prop('disabled', true).val('Historical Playoff Metrics (no rows)');
                dfd.resolve(); return;
            }
            // Stadium lookup for capacity/year opened
            var f = AGOL_CONFIG.stadiums.fields;
            var stadLookup = {};
            stadFeats.forEach(function(ft){
                var a = ft.attributes||{}; var fid = a[f.fid];
                if (fid == null) { var alt = Object.keys(a).find(function(k){return k.toLowerCase()===f.fid.toLowerCase();}); if (alt) fid = a[alt]; }
                if (fid != null) stadLookup[Number(fid)] = { capacity: a[f.capacity], opened: a[f.opened] };
            });
            // Build rows with original field names expected by legacy chart code
            var rows = [];
            // Also build normalized copy for prior-use logic (keep existing _PCAP_ROWS behavior)
            var roundNormMap = {
                'BI-DISTRICT':'r64','BI DISTRICT':'r64','BIDISTRICT':'r64',
                'ROUND-OF-64':'r64','ROUND OF 64':'r64','ROUND OF SIXTY FOUR':'r64','R64':'r64',
                'AREA':'r32','ROUND-OF-32':'r32','ROUND OF 32':'r32','R32':'r32',
                'REGIONAL':'r16','ROUND-OF-16':'r16','ROUND OF 16':'r16','R16':'r16',
                'REGION SEMI-FINAL':'rQF','REGIONAL QUARTERFINAL':'rQF','STATE QUARTERFINAL':'rQF','STATE-QUARTERFINALS':'rQF','QUARTERFINAL':'rQF','QUARTER-FINAL':'rQF','QUARTER FINALS':'rQF',
                'SEMIFINAL':'rSF','SEMI-FINAL':'rSF','STATE SEMIFINAL':'rSF','STATE SEMI-FINAL':'rSF','SEMI FINALS':'rSF',
                'STATE CHAMPIONSHIP':'rF','FINAL':'rF','FINALS':'rF','CHAMPIONSHIP':'rF','STATE FINAL':'rF'
            };
            function normRound(r){
                if(!r) return 'other';
                var k=String(r).trim().toUpperCase();
                if (roundNormMap[k]) return roundNormMap[k];
                // Heuristic fallback: strip punctuation and infer by number/keywords
                var cleaned = k.replace(/[^A-Z0-9]+/g,' ');
                if (/(^|\s)64(\s|$)/.test(cleaned) || /ROUND\s+OF\s+64/.test(cleaned)) return 'r64';
                if (/(^|\s)32(\s|$)/.test(cleaned) || /ROUND\s+OF\s+32/.test(cleaned)) return 'r32';
                if (/(^|\s)16(\s|$)/.test(cleaned) || /ROUND\s+OF\s+16/.test(cleaned)) return 'r16';
                // Order matters: check QUARTER before FINAL, SEMI before FINAL
                if (/QUARTER/.test(cleaned)) return 'rQF';
                if (/SEMI/.test(cleaned)) return 'rSF';
                if (/(^|\s)FINAL(S)?(\s|$)/.test(cleaned) || /CHAMPIONSHIP/.test(cleaned)) return 'rF';
                return 'other';
            }
            pcapFeats.forEach(function(ft){
                var a = ft.attributes||{}; var fid = a.stadium_fid; var stad = (fid!=null)? stadLookup[Number(fid)] : null;
                rows.push({
                    class: (a.Class||'').toString().trim().toUpperCase(),
                    round: (a.Round||'').toString().trim(),
                    capacity: stad ? (+stad.capacity||0) : 0,
                    opened: stad ? stad.opened : null,
                    year: (a.Year && /\d+/.test(a.Year)) ? parseInt(a.Year,10) : null,
                    stadium_fid: (fid!=null? Number(fid): null),
                    roundCode: normRound(a.Round)
                });
            });
            // Cache normalized rows for coloring (roundCode acts as prior-use round bucket)
            _PCAP_ROWS = rows.map(function(r){ return { classification: r.class, round: r.roundCode, year_opened: r.opened, capacity: r.capacity, year_comp: r.year, count:1, stadium_fid: r.stadium_fid }; });
            // Cache full rows for popup prior-use breakdown
            _PCAP_ROWS_FULL = (pcapFeats||[]).map(function(ft){
                var a = ft.attributes||{};
                var fid = a.stadium_fid!=null ? Number(a.stadium_fid) : null;
                var yr = (a.Year && /\d+/.test(a.Year)) ? parseInt(a.Year,10) : null;
                return { stadium_fid: fid, class: (a.Class||'').toString().trim().toUpperCase(), round: (a.Round||'').toString().trim(), location: (a.Location||'').toString().trim(), year: yr };
            });
            // Filter invalid minimal data for charting
            rows = rows.filter(function(r){ return r.class && r.round; });
            if (!rows.length){ $('#expandbtn').prop('disabled', true).val('Historical Playoff Metrics (filtered empty)'); dfd.resolve(); return; }
            var ndx = crossfilter(rows);
            var all = ndx.groupAll();
            var classDimension = ndx.dimension(function(d){ return (Number(d.class[0]) % 6 + 1) + 'A'; });
            var roundDimension = ndx.dimension(function(d){ return d.round.toLowerCase().split('-').map(function(i){ return i[0] !== 'o' ? i[0].toUpperCase() + i.substring(1) : i; }).join(' '); });
            var capacityDimension = ndx.dimension(function(d){ return d.capacity; });
            var allDimension = ndx.dimension(function(d){ return 1; });
            var playoffyearDimension = ndx.dimension(function(d){ return d.year; });
            var yearbuiltDimension = ndx.dimension(function(d){ return d.opened; });
            var classGroup = classDimension.group();
            var roundGroup = roundDimension.group();
            var capacityGroup = capacityDimension.group(function(d){ return Math.floor(d/1000)*1000; });
            // Set DC default colors to avoid d3.schemeCategory20c warning and ensure consistent palette
            try {
                if (typeof dc !== 'undefined' && dc.config && typeof dc.config.defaultColors === 'function' && typeof d3 !== 'undefined' && d3.schemeCategory10) {
                    dc.config.defaultColors(d3.schemeCategory10);
                }
            } catch(e) { /* ignore */ }
            // reductio aggregations (guard if reductio not loaded)
            // If reductio available, use manual aggregator without invoking reductio to avoid its warnings; otherwise use fallback
            var capstatGroup = {
                all: function(){ return [{key:'stats', value: (function(){
                    var vals = capacityDimension.top(Infinity).map(function(r){return r.capacity;}).filter(function(v){return v>0;});
                    if(!vals.length) return {count:0,min:0,max:0,avg:0,median:0,std:0};
                    vals.sort(function(a,b){return a-b;});
                    var count=vals.length; var min=vals[0]; var max=vals[count-1];
                    var sum=vals.reduce(function(a,b){return a+b;},0); var avg=sum/count;
                    var median = (count%2)? vals[Math.floor(count/2)] : (vals[count/2-1]+vals[count/2])/2;
                    var varSum=vals.reduce(function(acc,v){return acc+Math.pow(v-avg,2);},0)/count; var std=Math.sqrt(varSum);
                    return {count:count,min:min,max:max,avg:avg,median:median,std:std};
                })()}]; }
            };
            var playoffyearGroup = playoffyearDimension.group().reduce(
                function(p,v){ p.push(v.capacity); return p; },
                function(p,v){ var idx=p.indexOf(v.capacity); if(idx>-1) p.splice(idx,1); return p; },
                function(){ return []; }
            );
            var yearbuiltGroup = yearbuiltDimension.group(function(d){ return Math.floor(d/10)*10; });
            // Derive data-driven domains
            var curYear = new Date().getFullYear();
            var validPlayoffYears = rows.map(function(r){ return r.year; }).filter(function(v){ return v != null && !isNaN(v); });
            var minPlayoffYear = validPlayoffYears.length ? Math.min.apply(Math, validPlayoffYears) : (curYear - 10);
            // Prior-use data typically through previous year
            var maxPlayoffYear = validPlayoffYears.length ? Math.max.apply(Math, validPlayoffYears) : (curYear - 1);
            var openedYearsAll = (stadFeats||[]).map(function(ft){ var a=ft.attributes||{}; var y=a[f.opened]; return (y!=null && !isNaN(y)) ? +y : null; }).filter(function(v){ return v!=null && v>0; });
            var minOpenedYear = openedYearsAll.length ? Math.min.apply(Math, openedYearsAll) : (curYear - 120);
            // Year built can go through current year
            var maxOpenedYear = openedYearsAll.length ? Math.max.apply(Math, openedYearsAll) : curYear;
            var capacityValues = rows.map(function(r){ return r.capacity; }).filter(function(v){ return v!=null && !isNaN(v) && v>0; });
            var maxCapacity = capacityValues.length ? Math.max.apply(Math, capacityValues) : 103000;

            // Instantiate charts (pie + bars) per original code
            classChart = dc.pieChart('#class-chart');
            roundChart = dc.pieChart('#round-chart');
            capacityChart = dc.barChart('#capacity-chart');
            playoffyearChart = dc.barChart('#playoffyear-chart');
            yearbuiltChart = dc.barChart('#yearbuilt-chart');
            // Number displays
            ct = dc.numberDisplay('#ct');
            min = dc.numberDisplay('#min');
            max = dc.numberDisplay('#max');
            mean = dc.numberDisplay('#mean');
            median = dc.numberDisplay('#median');
            stdev = dc.numberDisplay('#stdev');
            classChart.width(250).height(220).radius(100).dimension(classDimension).group(classGroup).colors(d3.scaleOrdinal(d3.schemeCategory10)).legend(dc.legend().x(250).y(10)).label(function(d){ if(classChart.hasFilter() && !classChart.hasFilter(d.key)) return '0%'; var label=''; if(all.value()) label += Math.floor(d.value/all.value()*100)+'%'; return label; });
            // Sort class legend from largest to smallest (6A, 5A, 4A, 3A, 2A, 1A)
            dc.override(classChart, 'legendables', function(){
                var legendables = classChart._legendables();
                var order = ['6A','5A','4A','3A','2A','1A'];
                var rank = {}; order.forEach(function(k,i){ rank[k]=i; });
                return legendables.sort(function(a,b){
                    var ak = a.name || (a.data && a.data.key) || '';
                    var bk = b.name || (b.data && b.data.key) || '';
                    var ai = (ak in rank) ? rank[ak] : 999;
                    var bi = (bk in rank) ? rank[bk] : 999;
                    return ai - bi;
                });
            });
            roundChart.width(250).height(220).radius(100).dimension(roundDimension).group(roundGroup).ordering(function(d){ return -d.value; }).colors(d3.scaleOrdinal(d3.schemeCategory10)).legend(dc.legend().x(250).y(10)).label(function(d){ if(roundChart.hasFilter() && !roundChart.hasFilter(d.key)) return '0%'; var label=''; if(all.value()) label += Math.floor(d.value/all.value()*100)+'%'; return label; });
            dc.override(roundChart,'legendables',function(){ var l=roundChart._legendables(); return l.sort(function(a,b){ return a.data<b.data; }); });
            capacityChart.width(770).height(220).margins({top:10,right:50,bottom:30,left:40}).dimension(capacityDimension).group(capacityGroup).elasticY(true).gap(1).round(dc.round.floor).alwaysUseRounding(true).x(d3.scaleLinear().domain([0, maxCapacity + 1000])).xUnits(dc.units.fp.precision(1000)).renderHorizontalGridLines(true).filterPrinter(function(filters){ var f=filters[0]; return f[0]+' -> '+f[1]; }); capacityChart.yAxis().ticks(5);
            playoffyearChart.width(390).height(220).margins({top:10,right:50,bottom:30,left:40}).dimension(playoffyearDimension).group(playoffyearGroup).elasticY(true).centerBar(true).gap(1).x(d3.scaleLinear().domain([minPlayoffYear - 0.5, maxPlayoffYear + 0.5])).xUnits(dc.units.fp.precision(1)).valueAccessor(function(d){ return d.value.median ? d.value.median : (Array.isArray(d.value)? (function(arr){ if(!arr.length) return 0; var s=arr.slice().sort(function(a,b){return a-b;}); var n=s.length; return (n%2)? s[Math.floor(n/2)] : (s[n/2-1]+s[n/2])/2; })(d.value) : 0); }).colors(['#d95f02']).renderHorizontalGridLines(true).filterPrinter(function(filters){ var f=filters[0]; return d3.format('.0f')(Math.floor(f[0]))+' -> '+d3.format('.0f')(Math.floor(f[1])); }); playoffyearChart.xAxis().tickFormat(d3.format('d')).ticks(8);
            yearbuiltChart.width(390).height(220).margins({top:10,right:50,bottom:30,left:40}).dimension(yearbuiltDimension).group(yearbuiltGroup).elasticY(true).gap(1).round(dc.round.floor).alwaysUseRounding(true).x(d3.scaleLinear().domain([minOpenedYear, maxOpenedYear + 1])).xUnits(dc.units.fp.precision(10)).colors(['#1b9e77']).renderHorizontalGridLines(true).filterPrinter(function(filters){ var f=filters[0]; return f[0]+' -> '+f[1]; }); yearbuiltChart.xAxis().tickFormat(d3.format('d'));
            // Number displays wiring
            ct.group(capstatGroup).valueAccessor(function(d){ return d.value.count; }).formatNumber(d3.format(',.0f'));
            min.group(capstatGroup).valueAccessor(function(d){ return d.value.min; }).formatNumber(d3.format(',.0f'));
            max.group(capstatGroup).valueAccessor(function(d){ return d.value.max; }).formatNumber(d3.format(',.0f'));
            mean.group(capstatGroup).valueAccessor(function(d){ return d.value.avg; }).formatNumber(d3.format(',.0f'));
            median.group(capstatGroup).valueAccessor(function(d){ return d.value.median; }).formatNumber(d3.format(',.0f'));
            stdev.group(capstatGroup).valueAccessor(function(d){ return d.value.std; }).formatNumber(d3.format(',.0f'));
            dc.renderAll();
            $('#expandbtn').prop('disabled', false).val('Show Historical Playoff Metrics');
            $('#expandbtn').off('click').on('click', function(){
                var $charts = $('#charts');
                $charts.slideToggle('slow', function(){
                    var visible = $charts.is(':visible');
                    $('#expandbtn').val(visible ? 'Hide Historical Playoff Metrics' : 'Show Historical Playoff Metrics');
                });
            });
            dfd.resolve();
        }).fail(function(xhr,status,err){ debugLog('[charts] query error', status, err); $('#expandbtn').prop('disabled', true).val('Historical Playoff Metrics (error)'); dfd.resolve(); });
    } catch(e) {
        debugLog('[charts] setup exception', e);
        $('#expandbtn').prop('disabled', true).val('Historical Playoff Metrics (error)');
        dfd.resolve();
    }
    return dfd.promise();
}

// Date helpers used by selectionSetup
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
        // If charts are disabled, skip capacity auto-adjustment
        if (!roundChart || !classChart || typeof dc === 'undefined' || !dc.redrawAll) {
            return;
        }
        var classf = document.forms[0].Classification.options[document.forms[0].Classification.selectedIndex].value;
        var round = document.forms[0].Round.selectedIndex;

        roundChart.filterAll();
        classChart.filterAll();
        dc.redrawAll();
        if (round) {
            //Filter round chart
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
        };

        roundChart.on("postRedraw", updateSlider);
        classChart.on("postRedraw", updateSlider);
    }

function selectionSetup() {
    var seasonstart = new Date(new Date().getFullYear(), 10, NthDay(2, 5, 11, new Date().getFullYear())-1);
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

    if ($.fn.combobox) {
        $("#School1").combobox({
            select: function(event, ui) { updateClassAndRound("#School1") }
        });
        $("#School2").combobox({
            select: function(event, ui) { updateClassAndRound("#School2") }
        });
        $("#Classification").combobox({
            select: function(event, ui) { setCapacities(); }
        });
        $('#classrow input.ui-autocomplete-input').css('width', '110px')
        $("#Round").combobox({
            select: function(event, ui) { setCapacities(); }
        });
        $('#roundrow input.ui-autocomplete-input').css('width', '110px')
    } else {
        // Fallback to plain selects
        $("#School1").on('change', function(){ updateClassAndRound("#School1"); });
        $("#School2").on('change', function(){ updateClassAndRound("#School2"); });
        $("#Classification").on('change', function(){ setCapacities(); });
        $("#Round").on('change', function(){ setCapacities(); });
    }
}

// Helper: Query all features with pagination for ArcGIS FeatureServer
function queryAllFeatures(url, baseParams) {
    var d = $.Deferred();
    var all = [];
    var offset = 0;
    var pageSize = baseParams.resultRecordCount || 2000;
    function onePage() {
        var params = $.extend({}, baseParams, { resultOffset: offset, resultRecordCount: pageSize, f: 'json' });
        if (DEBUG) debugLog('[queryAll] page', { url: url, params: params });
        $.ajax({ url: url, method: 'GET', data: params, dataType: 'json', timeout: 30000 })
          .done(function(resp){
              if (resp && resp.error) {
                  debugLog('[queryAll] ERROR payload', resp.error);
                  d.reject(resp.error.message || 'Unknown service error');
                  return;
              }
              var feats = (resp && resp.features) ? resp.features : [];
              all = all.concat(feats);
              if (resp && resp.exceededTransferLimit) {
                  offset += feats.length;
                  onePage();
              } else {
                  debugLog('[queryAll] total features', all.length);
                  d.resolve(all);
              }
          })
          .fail(function(xhr, status, err){
              debugLog('[queryAll] AJAX fail', status, err, xhr && xhr.responseText);
              d.reject(err || status || 'request failed');
          });
    }
    onePage();
    return d.promise();
}

// Global cache for PCAP per-event rows (built in chartSetup when PCAP is configured)
var _PCAP_ROWS = null; // Array of {classification, round, year_opened, capacity, year_comp, count, stadium_fid}

// Helper: map Round select index (0..6) to normalized round codes used in _PCAP_ROWS
function roundCodesFromIndex(idx){
    var order = ['r64','r32','r16','rQF','rSF','rF'];
    if (!idx || idx <= 0) return order.slice();
    // idx 1 -> r64, 2 -> r32, ... 6 -> rF
    var i = Math.min(Math.max(idx,1), order.length);
    return order.slice(i-1);
}

// Compute sets of stadium_fid with prior use, based on current UI and chart filters
function computePcapPriorUseSets(classSel, roundIdx){
    if (!_PCAP_ROWS || !_PCAP_ROWS.length) return null;
    var cls = (classSel||'').toString().trim().toUpperCase();
    var codes = roundCodesFromIndex(roundIdx);
    // Year filter from playoffyearChart (if exists and has a range filter)
    var yearMin = null, yearMax = null;
    if (typeof playoffyearChart !== 'undefined' && playoffyearChart && typeof playoffyearChart.filters === 'function') {
        var yf = playoffyearChart.filters();
        if (yf && yf.length) {
            var f0 = yf[0];
            if (Array.isArray(f0)) { yearMin = f0[0]; yearMax = f0[1]; }
            else if (f0 && typeof f0.isFiltered === 'function' && f0.isFiltered()) {
                var r = f0;
                yearMin = r[0]; yearMax = r[1];
            }
        }
    }
    var inClass = new Set();
    var inClassRound = new Set();
    for (var i=0;i<_PCAP_ROWS.length;i++){
        var r = _PCAP_ROWS[i];
        if (!r || r.stadium_fid == null) continue;
        if (cls && r.classification !== cls) continue;
        if (yearMin!=null && yearMax!=null) {
            var yc = r.year_comp; if (yc==null) continue; if (yc < yearMin || yc > yearMax) continue;
        }
        inClass.add(Number(r.stadium_fid));
        if (!roundIdx || roundIdx<=0) continue;
        if (r.round && codes.indexOf(r.round) !== -1) {
            inClassRound.add(Number(r.stadium_fid));
        }
    }
    return { inClass: inClass, inClassRound: inClassRound };
}