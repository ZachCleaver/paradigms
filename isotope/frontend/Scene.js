function Scene() {
	// Initialize methods
	this.update = Scene__update;
	this.loadPlayers = Scene__loadPlayers;
	this.loadAvatar = Scene__loadAvatar;
	this.doneLoadingAvatar = Scene__doneLoadingAvatar;
	this.loadOtherPlayers = Scene__loadOtherPlayers;
	this.receiveNews = Scene__receiveNews;
	this.requestNews = Scene__requestNews;
	this.players = [];
	this.loadPlayers();
	var canvas = document.getElementById("main_canvas");
	initGL(canvas);

	// Load the textures
	var texCrate = loadTexture("crate.png");
	var texDude = loadTexture("dude.png");
	var texGround = loadTexture("ground.jpg");

	// Make the ground
	this.ground = new Sprite(texGround, 1024, 1024, [0.0, 0.0, 0.0]);
	this.ground.rotx(0.5 * Math.PI);

	// Make the crate
	this.crate = new Sprite(texCrate, 256, 256, [128.0, 0.0, 0.0]);
	this.crate.setz(-800.0);

	this.timeRequestNews = 0.001 * new Date().getTime();
}

function httpPost(url, payload, callback) {
  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    if(request.readyState == 4) {
      if(request.status == 200)
        callback(request.responseText);
      else
      {
        if(request.status == 0 && request.statusText.length == 0)
          alert("Request blocked by same-origin policy");
        else
          alert("Server returned status " + request.status +
            ", " + request.statusText);
      }
    }
  }
  request.open('post', url, true);
  request.setRequestHeader('Content-Type',
    'application/x-www-form-urlencoded');
  request.send(payload);
}

function Scene__receiveNews(response) {
	var news = JSON.parse(response);
	var delta = Math.abs(0.001 * new Date().getTime() - news.time);
	if(delta > 10)
		alert("Client time more than 10 seconds out of sync with server!");
	
}

function Scene__requestNews(timeNow) {
	if(timeNow - this.timeRequestNews < 1.0)
		return;
	if (typeof this.avatarId == 'undefined')
		return;
	this.timeRequestNews = timeNow;
	var self = this;
	httpPost(this.serverUrl + "/news", this.avatarId,
			function(response) { self.receiveNews(response); }
		);
}

function Scene__update() {
	var timeNow = 0.001 * new Date().getTime();

	this.requestNews(timeNow);
	this.ground.draw();
	this.crate.draw();

	for(var p = 0; p < this.players.length; p++)
	{
		var player = this.players[p];
		player.update(timeNow);
	}

	this.timePrev = timeNow;
}

// Waits until the function specified by the string "sConstructor"
// becomes available (finishes loading), then instantiates it, and
// calls "callback", passing the instantiated object as a parameter.
// If it takes too long, callback is called with null as the parameter.
function callWhenAvailable(sConstructor, callback, interval_ms, timeout_ms) {
	var fn = window[sConstructor];
	if(typeof fn === 'function') {
		var newobj = new fn();
		callback(newobj);
	}
	else {
		if(timeout_ms <= 0)
			callback(null);
		else {
			timeout_ms -= interval_ms;
			var callClosure = function() { callWhenAvailable(sConstructor, callback, interval_ms, timeout_ms) }
			setTimeout(callClosure, interval_ms);
		}
	}
}

// Example, if url="http://example.com/path/abc.def", this will return "abc"
function lastFilenameWithoutExtension(url) {
	var filename = url.substr(url.lastIndexOf('/') + 1);
	var namelen = filename.indexOf('.');
	if(namelen < 0)
		namelen = filename.length;
	return filename.substr(0, namelen);
}

// "url" is a string that specifies the url of a .js file. This
// file must contain a method with the name of the file (without
// the extension) that is a constructor for an object.
// "callback" is a function taking one parameter. The instantiated
// object will be passed to it. If the script takes too long to
// download, "callback" will still be called, but "null" will be
// passed to it.
function loadJavascriptFile(url, callback) {
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = url;
	var oHead = document.getElementsByTagName("head")[0];
	oHead.appendChild(script);
	var name = lastFilenameWithoutExtension(url);
	callWhenAvailable(name, callback, 250, 10000);
}


function Scene__loadPlayers() {
	var pathStart = window.location.href.indexOf("/", 8);
	if(pathStart == -1) {
		alert("Expected a valid URL, beginning with http://, and containing a path");
		return;
	}
	this.serverUrl = window.location.href.substring(0, pathStart);
	this.fetchPrefix = this.serverUrl + "/fetch?";
//	alert(this.fetchPrefix);
	var paramStart = window.location.href.indexOf("?", pathStart);
	if(paramStart == -1) {
//		alert("Expected URL parameters");
		return;
	}
	var params = window.location.href.substring(paramStart + 1);
	var originStart = params.indexOf("origin=");
	if(originStart == -1) {
		alert("Expected an origin parameter");
		return;
	}
	var origin = params.substring(originStart + 7);
	this.loadAvatar(origin);
	this.loadOtherPlayers();
}

function Scene__loadAvatar(origin) {
	var remoteurl = this.fetchPrefix + origin;
	//alert("About to attempt to load " + remoteurl);
	var self = this;
	loadJavascriptFile(remoteurl, function(newObj) { self.doneLoadingAvatar(newObj); } );
}

function Scene__doneLoadingAvatar(newObj) {
	this.players.push(newObj);
	newObj.serverUrl = this.serverUrl;
	this.avatarId = newObj.pub.id;
}

function Scene__loadOtherPlayers() {
}
