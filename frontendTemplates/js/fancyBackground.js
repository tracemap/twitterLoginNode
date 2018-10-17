'use strict';
var fancyBgDetail = 0;
var fancyBgIntensity = 0;
var fancyBgVpWidth = 0;
var fancyBgVpHeight = 0;
var oldBg = "";

function setFancyBg( thisDetail, thisIntensity){
    fancyBgVpWidth = screen.width;
    fancyBgVpHeight = screen.height;
    if(setFancyBg.length !== 2){
        throw new Error("Need fancyBgDetail (pixel size) and fancyBgIntensity (0.0-1.0) as parameters");
    }
    fancyBgDetail = Number(thisDetail);
    fancyBgIntensity = thisIntensity;
    var html = "";
    for ( var x = 0; x < fancyBgVpWidth; x += fancyBgDetail){
        for ( var y=0; y < fancyBgVpHeight; y += fancyBgDetail){
            html += "<div class=\"" + x + "x" + y + "\" style=\"height: " + fancyBgDetail + "px; width: " + fancyBgDetail + "px; position: absolute; opacity: " + fancyBgIntensity + "; z-index: -1; left: " + x + "px; top: " + y + "px; background-color: #000; transition: background-color 2s linear;\"></div>"
        }
    }
    $("#background").replaceWith("<div id=\"background\" style=\"height: "+ fancyBgVpHeight+ "px; width: "+ fancyBgVpWidth + "px; position: fixed; overflow: hidden; zIndex: -1; background-color: #000; top: 0px; left: 0;\">" + html + "</div>");
    fancyBgChangeColors();
}

function fancyBgChangeColors() {
    for ( var x = 0; x < fancyBgVpWidth; x += fancyBgDetail){
        for ( var y=0; y < fancyBgVpHeight; y += fancyBgDetail){
            var r = Math.floor(Math.random() * 255);
            var g = Math.floor(Math.random() * 255);
            var b = Math.floor(Math.random() * 255);
            var tile = x + "x" + y;
            var color = "rgb(" + r + "," + g + "," + b + ")";
            $("#background ." + tile).css("backgroundColor", color);
        }
    }
}
