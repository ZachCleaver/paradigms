function Obama() {
	this.control = Obama__control;
	this.update = Obama__update;
	this.onClickCanvas = Obama__onClickCanvas;
	this.updateFromNews = Obama__updateFromNews;

	this.direction = -0.5 * Math.PI;

	var texDude = loadTexture("obama.png"); // todo: make this remote
	this.icon = new Sprite(texDude, 64, 128);
	this.icon.setz(-300);

	this.speed = 300; // in voxels-per-second
	this.timePrev = 0.001 * new Date().getTime();

	this.pub = new Object();
	this.pub.id = 0;
	this.pub.dx = this.icon.x();
	this.pub.dz = this.icon.z();
	this.pub.eta = this.timePrev;
	this.pub.url = "";
}

function Obama__control(timeNow) {
	var elapsed = Math.min(timeNow - this.timePrev, 1.0);

	// Make the camera follow the avatar
	camPos[0] = this.icon.x();// + 500 * Math.sin(-direction);
	camPos[1] = this.icon.y() + 100;
	camPos[2] = this.icon.z() + 500;// * Math.cos(-direction);

	// Respond to pressed keys
	if (keys[37]) { // left
		this.direction -= 3.0 * elapsed;
		this.icon.roty(-3.0 * elapsed);
	}
	if (keys[39]) { // right
		this.direction += 3.0 * elapsed;
		this.icon.roty(3.0 * elapsed);
	}
	if (keys[40]) { // down
		this.icon.setx(this.icon.x() - Math.cos(this.direction) * this.speed * elapsed);
		this.icon.setz(this.icon.z() - Math.sin(this.direction) * this.speed * elapsed);
	}
	if (keys[38]) { // up
		this.icon.setx(this.icon.x() + Math.cos(this.direction) * this.speed * elapsed);
		this.icon.setz(this.icon.z() + Math.sin(this.direction) * this.speed * elapsed);
	}
	if (keys[33]) { // Page Up
		this.icon.sety(this.icon.y() + this.speed * elapsed);
	}
	if (keys[34]) { // Page Down
		this.icon.sety(this.icon.y() - 300.0 * elapsed);
	}
	if(keys[88]) { // X
		this.icon.rotx(1.0 * elapsed);
	}
	if(keys[89]) { // Y
		this.icon.roty(1.0 * elapsed);
	}
	if(keys[90]) { // Z
		this.icon.rotz(1.0 * elapsed);
	}
	if(keys[32]) { // space bar
		alert(this.icon.x() + ", " + this.icon.z() + "      " + camPos[0] + ", " + camPos[2]);
	}
}


function Obama__update(timeNow) {

	var p = this.pub;
	if(timeNow < p.eta) {

		// Face in the direction we are moving
		var tx = p.dx - this.icon.x();
		var tz = p.dz - this.icon.z();
		var newDirection = Math.atan2(tz, tx);
		var deltaDir = newDirection - this.direction;
		if(Math.abs(deltaDir) > 0.02) {
			this.icon.roty(deltaDir);
			this.direction = newDirection;
		}

		// Move toward the destination, such that we arrive at the expected time
		var invDenom = 1.0 / (p.eta - this.timePrev);
		var newX = ((timeNow - this.timePrev) * p.dx + (p.eta - timeNow) * this.icon.x()) * invDenom;
		var newZ = ((timeNow - this.timePrev) * p.dz + (p.eta - timeNow) * this.icon.z()) * invDenom;
		this.icon.setx(newX);
		this.icon.setz(newZ);
	} else {
		// Time is up. We should be at the destination.
		this.icon.setx(p.dx);
		this.icon.setz(p.dz);
	}

	this.icon.draw();
	this.timePrev = timeNow;
}

function Obama__updateFromNews(story) {
	this.pub.dx = story.dx;
	this.pub.dz = story.dz;
	this.pub.eta = story.eta;
}

function Obama__noop() {
}

function Obama__onClickCanvas(e) {
	// Calculate where the user clicked
	var clickY = e.pageY - this.canvas.offsetTop;
	var clickX = e.pageX - this.canvas.offsetLeft;
	if(clickY < this.canvas.height / 2 + 2)
		return; // Clicked in the sky
	var scale = camPos[1] / (clickY - (this.canvas.height / 2));
	var destZ = camPos[2] - 600.0  * scale;
	var destX = camPos[0] + scale * (clickX - (this.canvas.width / 2));

	// Compensate for camera yaw to find the real destination
	var dz = destZ - camPos[2];
	var dx = destX - camPos[0];
	var theta = Math.atan2(dz, dx) + (camYaw + 0.5 * Math.PI);
	var mag = Math.sqrt(dz * dz + dx * dx);
	this.pub.dx = camPos[0] + mag * Math.cos(theta);
	this.pub.dz = camPos[2] + mag * Math.sin(theta);

	// Calculate estimated time of arrival based on avatar speed
	var distX = this.pub.dx - this.icon.x();
	var distZ = this.pub.dz - this.icon.z();
	var dist = Math.sqrt(distX * distX + distZ * distZ);
	var travelTime = dist / this.speed;
	this.pub.eta = 0.001 * new Date().getTime() + travelTime;

	// Send the scoop (destination and e.t.a.) to the server
	var jsonBlob = JSON.stringify(this.pub);
	httpPost(this.serverUrl + "/scoop", jsonBlob, Obama__noop);
}
