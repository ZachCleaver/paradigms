function Bill() {
	this.update = Bill__update;
	this.onClickCanvas = Bill__onClickCanvas;

	this.direction = -0.5 * Math.PI;

	var texDude = loadTexture("dude.png"); // todo: make this remote
	this.avatar = new Sprite(texDude, 64, 128);
	this.avatar.setz(-300);

	this.canvas = document.getElementById("main_canvas");
	var self = this;
	this.canvas.addEventListener("click", function(e) { self.onClickCanvas(e); }, true);
	this.speed = 300; // in voxels-per-second
	this.timePrev = 0.001 * new Date().getTime();

	this.pub = new Object();
	this.pub.id = Math.floor(Math.random() * 9007199254740990);
	this.pub.dx = this.avatar.x();
	this.pub.dz = this.avatar.z();
	this.pub.eta = this.timePrev;
}

function Bill__update(timeNow) {
	var elapsed = Math.min(timeNow - this.timePrev, 1.0);


	// Make the camera follow the avatar
	camPos[0] = this.avatar.x();// + 500 * Math.sin(-direction);
	camPos[1] = this.avatar.y() + 100;
	camPos[2] = this.avatar.z() + 500;// * Math.cos(-direction);

	// Respond to pressed keys
	if (keys[37]) { // left
		this.direction -= 3.0 * elapsed;
		this.avatar.roty(-3.0 * elapsed);
	}
	if (keys[39]) { // right
		this.direction += 3.0 * elapsed;
		this.avatar.roty(3.0 * elapsed);
	}
	if (keys[40]) { // down
		this.avatar.setx(this.avatar.x() - Math.cos(this.direction) * this.speed * elapsed);
		this.avatar.setz(this.avatar.z() - Math.sin(this.direction) * this.speed * elapsed);
	}
	if (keys[38]) { // up
		this.avatar.setx(this.avatar.x() + Math.cos(this.direction) * this.speed * elapsed);
		this.avatar.setz(this.avatar.z() + Math.sin(this.direction) * this.speed * elapsed);
	}
	if (keys[33]) { // Page Up
		this.avatar.sety(this.avatar.y() + this.speed * elapsed);
	}
	if (keys[34]) { // Page Down
		this.avatar.sety(this.avatar.y() - 300.0 * elapsed);
	}
	if(keys[88]) { // X
		this.avatar.rotx(1.0 * elapsed);
	}
	if(keys[89]) { // Y
		this.avatar.roty(1.0 * elapsed);
	}
	if(keys[90]) { // Z
		this.avatar.rotz(1.0 * elapsed);
	}
	if(keys[32]) { // space bar
		alert(this.avatar.x() + ", " + this.avatar.z() + "      " + camPos[0] + ", " + camPos[2]);
	}



	var p = this.pub;
	if(timeNow < p.eta) {

		// Face in the direction we are moving
		var tx = p.dx - this.avatar.x();
		var tz = p.dz - this.avatar.z();
		var newDirection = Math.atan2(tz, tx);
		var deltaDir = newDirection - this.direction;
		if(Math.abs(deltaDir) > 0.02) {
			this.avatar.roty(deltaDir);
			this.direction = newDirection;
		}

		// Move toward the destination, such that we arrive at the expected time
		var invDenom = 1.0 / (p.eta - this.timePrev);
		var newX = ((timeNow - this.timePrev) * p.dx + (p.eta - timeNow) * this.avatar.x()) * invDenom;
		var newZ = ((timeNow - this.timePrev) * p.dz + (p.eta - timeNow) * this.avatar.z()) * invDenom;
		this.avatar.setx(newX);
		this.avatar.setz(newZ);
	} else {
		// Time is up. We should be at the destination.
		this.avatar.setx(p.dx);
		this.avatar.setz(p.dz);
	}

	this.avatar.draw();
	this.timePrev = timeNow;
}

function Bill__noop() {
}

function Bill__onClickCanvas(e) {
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
	var distX = this.pub.dx - this.avatar.x();
	var distZ = this.pub.dz - this.avatar.z();
	var dist = Math.sqrt(distX * distX + distZ * distZ);
	var travelTime = dist / this.speed;
	this.pub.eta = 0.001 * new Date().getTime() + travelTime;

	// Send the scoop (destination and e.t.a.) to the server
	var jsonBlob = JSON.stringify(this.pub);
	httpPost(this.serverUrl + "/scoop", jsonBlob, Bill__noop);
}
