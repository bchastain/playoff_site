
$(document).ready(function () {

	// Expand Panel
	$("#open").click(function () {
		$("div#panel").slideDown("slow");

	});

	// Collapse Panel
	$("#close").click(function () {
		$("div#panel").slideUp("slow");
	});

	// Switch buttons from "Log In | Register" to "Close Panel" on click
	$("#toggle a").click(function () {
		$("#toggle a").toggle();
	});

});


$( function() {
	var vals = [];
	for (i=0; i<100; i++) {
		vals[i] = commafy(i);
	}
	$( "#slider-range" ).slider({
	  range: true,
	  min: 0,
	  max: 100,
	  values: [ 0, 100 ],
	  slide: function( event, ui ) {
		$( "#amount" ).val( commafy(ui.values[ 0 ]) + " - " + commafy(ui.values[ 1 ] ));
	  }
	})
	.slider("pips", {
        rest: "label",
        labels: vals
    });
	
	$('.ui-slider-label')[100].innerHTML = "102,000";
	function commafy(val) {
		/* Total range 0 - 2,500,000 */
		/* 70% from 25,000 to 200,000, what have left (2,325,000) share left (25,000) and right (2,300,000) */
		/* So, final dividing */
		var toPresent = 0;
		if (val <= 20) {
			toPresent = val * 100;
		} else if (val <= 66) {
			toPresent = 2000 + (val - 20) * 500;
		} else {
			toPresent = 25000 + Math.floor((val - 66) / 3400 * 77000) * 100;
		};
		return String(toPresent).split("").reverse().join("")
			.replace(/(.{3}\B)/g, "$1,")
			.split("").reverse().join("");
	}
	
} );

(function ($) {
	$.widget("custom.combobox", {
		_create: function () {
			this.wrapper = $("<span>")
				.addClass("custom-combobox")
				.insertAfter(this.element);

			this.element.hide();
			this._createAutocomplete();
			this._createShowAllButton();
		},

		_createAutocomplete: function () {
			var selected = this.element.children(":selected"),
				value = selected.val() ? selected.text() : "";

			this.input = $("<input>")
				.appendTo(this.wrapper)
				.val(value)
				.attr("title", "")
				.addClass("custom-combobox-input ui-widget ui-widget-content ui-state-default ui-corner-left")
				.autocomplete({
					delay: 0,
					minLength: 0,
					source: $.proxy(this, "_source")
				})
				.tooltip({
					tooltipClass: "ui-state-highlight"
				});

			this._on(this.input, {
				autocompleteselect: function (event, ui) {
					ui.item.option.selected = true;
					this._trigger("select", event, {
						item: ui.item.option
					});
				},

				autocompletechange: "_removeIfInvalid"
			});
		},

		_createShowAllButton: function () {
			var input = this.input,
				wasOpen = false;

			$("<a>")
				.attr("tabIndex", -1)
				.attr("title", "Show All Items")
				.tooltip()
				.appendTo(this.wrapper)
				.button({
					icons: {
						primary: "ui-icon-triangle-1-s"
					},
					text: false
				})
				.removeClass("ui-corner-all")
				.addClass("custom-combobox-toggle ui-corner-right")
				.mousedown(function () {
					wasOpen = input.autocomplete("widget").is(":visible");
				})
				.click(function () {
					input.focus();

					// Close if already visible
					if (wasOpen) {
						return;
					}

					// Pass empty string as value to search for, displaying all results
					input.autocomplete("search", "");
				});
		},

		_source: function (request, response) {
			var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
			response(this.element.children("option").map(function () {
				var text = $(this).text();
				if (this.value && (!request.term || matcher.test(text)))
					return {
						label: text,
						value: text,
						option: this
					};
			}));
		},

		_removeIfInvalid: function (event, ui) {

			// Selected an item, nothing to do
			if (ui.item) {
				return;
			}

			// Search for a match (case-insensitive)
			var value = this.input.val(),
				valueLowerCase = value.toLowerCase(),
				valid = false;
			this.element.children("option").each(function () {
				if ($(this).text().toLowerCase() === valueLowerCase) {
					this.selected = valid = true;
					return false;
				}
			});

			// Found a match, nothing to do
			if (valid) {
				return;
			}

			// Remove invalid value
			this.input
				.val("")
				.attr("title", value + " didn't match any item")
				.tooltip("open");
			this.element.val("");
			this._delay(function () {
				this.input.tooltip("close").attr("title", "");
			}, 2500);
			this.input.autocomplete("instance").term = "";
		},

		_destroy: function () {
			this.wrapper.remove();
			this.element.show();
		}
	});
})(jQuery);