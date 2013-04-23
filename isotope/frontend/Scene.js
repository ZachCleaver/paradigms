function Scene() {
	// Initialize methods
	this.update = Scene__update;
	this.loadPlayer = Scene__loadPlayer;
	this.doneLoadingPlayer = Scene__doneLoadingPlayer;
	this.onLoadAvatar = Scene__onLoadAvatar;
	this.receiveNews = Scene__receiveNews;
	this.requestNews = Scene__requestNews;

	// Initialize the array of players
	this.players = new Array();

	// Determine the fetch url prefix
	var pathStart = window.location.href.indexOf("/", 8);
	if(pathStart == -1) {
		alert("Expected a valid URL, beginning with http://, and containing a path");
		return;
	}
	this.serverUrl = window.location.href.substring(0, pathStart);
	this.fetchPrefix = this.serverUrl + "/fetch?";

	// Determine the url of the avatar
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
	
	// Load the avatar
	var origin = params.substring(originStart + 7);
	var id = Math.floor(Math.random() * 9007199254740990);
	var self = this;
	this.canvas = document.getElementById("main_canvas");
	this.loadPlayer(origin, id, function(newObj) { self.onLoadAvatar(newObj); } );

	// Load the scenery textures
	initGL(this.canvas);
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
	var obj = JSON.parse(response);
	for(var i = 0; i < obj.stories.length; i++)
	{
		var story = obj.stories[i];
		var sid = story.id.toString();
		if(this.players.hasOwnProperty(sid)) {
			// We have already loaded this player. Just update it.
			var p = this.players[sid];
			p.updateFromNews(story);
		} else {
			// We have never seen this player before, so load it.
			this.loadPlayer(story.url, story.id, null);
		}
	}
}

function Scene__requestNews(timeNow) {
	if(timeNow - this.timeRequestNews < 1.0)
		return;
	if (typeof this.avatar == 'undefined')
		return;
	this.timeRequestNews = timeNow;
	var self = this;
	httpPost(this.serverUrl + "/news", this.avatar.pub.id,
			function(response) { self.receiveNews(response); }
		);
}

function Scene__update() {
	var timeNow = 0.001 * new Date().getTime();

	this.requestNews(timeNow);
	this.ground.draw();
	this.crate.draw();

	this.avatar.control(timeNow);
	for(var k in this.players) {
		if(this.players.hasOwnProperty(k)) {
			var player = this.players[k];
			player.update(timeNow);
		}
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
	var name = lastFilenameWithoutExtension(url);
	var fn = window[name];
	if(typeof fn === 'function') {
		var newobj = new fn();
		callback(newobj);
		return;
	}
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = url;
	var oHead = document.getElementsByTagName("head")[0];
	oHead.appendChild(script);
	callWhenAvailable(name, callback, 250, 10000);
}


function Scene__onLoadAvatar(newObj) {
	this.avatar = newObj;
	newObj.canvas = this.canvas;
	this.canvas.addEventListener("click", function(e) { newObj.onClickCanvas(e); }, true);
}

function Scene__loadPlayer(url, id, cb) {
	var fetchurl = this.fetchPrefix + url;
	var self = this;
	loadJavascriptFile(fetchurl, function(newObj) { self.doneLoadingPlayer(newObj, url, id, cb); } );
}

function Scene__doneLoadingPlayer(newObj, url, id, cb) {
	newObj.serverUrl = this.serverUrl;
	newObj.pub.url = url;
	newObj.pub.id = id;
	var sid = newObj.pub.id.toString();
	this.players[sid] = newObj;
	if(cb != null)
		cb(newObj);
}
