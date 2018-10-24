'use strict';
//$("element").append(html
console.log(document.documentElement.clientWidth);
var i = 0;
$(function makeLove(){
    window.setTimeout(function(){
        var vpwidth = document.documentElement.clientWidth;
        var vpheight = document.documentElement.clientHeight;
        var sizeThresh = Math.floor(vpwidth / 10);
        var size = Math.floor(Math.random() * sizeThresh) + 1;
        var xpos = (Math.random() * vpwidth) - size;
        makeHeart(size, xpos, vpheight, i);
        i += 1;
        return makeLove();
    },1000);
});

function makeHeart(size, xpos, vpheight, i){
    var html = "<div class=\"heart nr"+i+"\"></div>";
    $("#heartbox").append(html);
    $(".nr"+i).css("margin-left",xpos);
    $(".nr"+i).css("margin-top",vpheight);
    $(".nr"+i).css("height",size);
    $(".nr"+i).css("width",size);
    window.setTimeout(function(){
        $(".nr"+i).css("margin-top",-size);
        window.setTimeout(function(){
            $(".nr"+i).remove();
        }, 10000);
    }, 50);
}
