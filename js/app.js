// A cross-browser requestAnimationFrame
// See https://hacks.mozilla.org/2011/08/animating-with-javascript-from-setinterval-to-requestanimationframe/
var requestAnimFrame = (function(){
  return window.requestAnimationFrame       ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame    ||
	window.oRequestAnimationFrame      ||
	window.msRequestAnimationFrame     ||
	function(callback){
	  window.setTimeout(callback, 1000 / 60);
	};
})();

// Additional function
function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.width = 600;
canvas.height = 300;
document.body.insertBefore(canvas,document.getElementById("credits"));

// Events for canvas
function onMouseOver() {
	console.log("on");
}

function onMouseMove(evt) {
  var mouseX = evt.pageX - canvas.offsetLeft;
  var mouseY = evt.pageY - canvas.offsetTop;
}

// The main game loop
var lastTime;
function main() {
  var now = Date.now();
  var dt = (now - lastTime) / 1000;

  update(dt);
  render();

  lastTime = now;
  requestAnimFrame(main);
};

function init() {
	//canvas.style.cursor = "url(img/aim.png)";
	document.getElementById('play-again').addEventListener('click', function() {
    reset();
  });

  reset();

  lastTime = Date.now();
  main();
}

// Load resouces
resources.load([
  'img/sprites.png',
  'img/terrain.png',
  'img/aim.png'
  //'img/test.png'
]);
resources.onReady(init);

// Game state
var zeroPointY = canvas.height-100;
var scoreForBoss = 200;

var player = {
  pos: [0, 0],
  sprite: new Sprite('img/sprites.png', // URL
					 [0, 0], // Position on sprites
					 [55, 34], // Size on sprites
					 15, // Speed
					 [0, 1]), // Frames
  				 armor: false,
  				 level: 1
};

var ground = [];
ground.push({
	  pos: [0,zeroPointY],
	  sprite: new Sprite('img/terrain.png', 
				 [0, 0], 
				 [9, 9])});                             
for (var i = 1; i < canvas.width/ground[0].sprite.size[0]; i++) {
   ground.push({
	  pos: [i*ground[0].sprite.size[0],zeroPointY],
	  sprite: new Sprite('img/terrain.png', 
						 [0, 0], 
						 [9, 9])
	});   
}

var bullets = [];
var enemies= [];
var explosions = [];
var lootAmmo = [];
var lootArmor = [];
var lvlUp = false;

var boss = {};

var lastFire = Date.now();
var gameTime = 0;
var isGameOver;

var score = 0;
var scoreEl = document.getElementById('score-number');

var ammunition = 20;
var ammunitionEl = document.getElementById('ammunition-number');

// Speed in pixels per second
var playerSpeed = 150;
var bulletSpeed = 500;
var enemySpeed = 100;
var bossSpeed = 300;

// Update game objects
function update(dt) {
  gameTime += dt;

  handleInput(dt);
  updateEntities(dt);

  // It gets harder over time by adding enemies using this
  // equation: 1-.993^gameTime
  if (player.level == 1 && !boss.sprite) {
  	if(Math.random() < 1 - Math.pow(.999, gameTime)) {
			if (enemies.length > 0) {
			  if (enemies[enemies.length-1].pos[0] < canvas.width-60) {
				enemies.push({
				  pos: [canvas.width, zeroPointY-26],
				  sprite: new Sprite('img/sprites.png', 
									  [0, 156], 
									  [60, 26],
									  16, 
									  [0, 1])
			  });
			  }
			} else {
			  enemies.push({
				  pos: [canvas.width, zeroPointY-26],
				  sprite: new Sprite('img/sprites.png', 
									  [0, 156], 
									  [60, 26],
									  16, 
									  [0, 1])
			  });     
			}
  	}
  }

  if (player.level == 2 && !boss.sprite) {
  	//canvas.onmouseover = onMouseOver;
  	canvas.onmousemove = onMouseMove;
  	canvas.style.cursor = "url(\"img/aim.png\"), auto";
  	boss = {
  		pos: [canvas.width/2, 0],
  		sprite: new Sprite ("img/sprites.png",
  												[0, 241],
  												[96,32],
  												40,
  												[0,1,2,3,4,5,6,7,8]),
  		direction: Math.random > 0.5 ? "backword" : "forward", 
  		lastDirUpdate: dt
  	}
  }

  checkCollisions();

  scoreEl.innerHTML = score;
  ammunitionEl.innerHTML = ammunition;
};

function handleInput(dt) {
  // if(input.isDown('DOWN') || input.isDown('s')) {
  //     player.pos[1] += playerSpeed * dt;
  // }

  // if(input.isDown('UP') || input.isDown('w')) {
  //     player.pos[1] -= playerSpeed * dt;
  // }

  if(input.isDown('LEFT') || input.isDown('a')) {
	player.pos[0] -= playerSpeed * dt;
  }

  if(input.isDown('RIGHT') || input.isDown('d')) {
	player.pos[0] += playerSpeed * dt;
  }

  if(input.isDown('SPACE') &&
	 !isGameOver &&
	 Date.now() - lastFire > 300 &&
	 ammunition > 0) {
	  ammunition--;
	  ammunitionEl.innerHTML = ammunition;
	  var x = player.pos[0] + player.sprite.size[0]-15;
	  var y;
	  if (player.level == 1) {
	  	y = player.pos[1] + player.sprite.size[1]/8;
	  } else {
	  	y = player.pos[1] + player.sprite.size[1]/16;
	  }
	  bullets.push({ pos: [x, y],
					 dir: 'forward',
					 sprite: new Sprite('img/sprites.png', [0, 146], [18, 8]) });
	  // bullets.push({ pos: [x, y],
	  //                dir: 'up',
	  //                sprite: new Sprite('img/sprites.png', [0, 50], [9, 5]) });
	  // bullets.push({ pos: [x, y],
	  //                dir: 'down',
	  //                sprite: new Sprite('img/sprites.png', [0, 60], [9, 5]) });

	  lastFire = Date.now();
  }
}

function updateEntities(dt) {
  // Update the player sprite animation
  player.sprite.update(dt);

  // Update the boss sprite animation
  if (boss.sprite) {
  	if (Date.now() - boss.lastDirUpdate > getRandomInt(500,1000)) {
  		if (Math.random() > 0.5) {
  			boss.direction = "forward";  			
  		} else {
  			boss.direction = "backward";
  		}
  		boss.lastDirUpdate = Date.now();
  	}  	
  	if (boss.direction == "forward") {
  		boss.pos[0] += bossSpeed * dt;
  	} else {
  		boss.pos[0] -= bossSpeed * dt;
  	}
  	boss.sprite.update(dt);
  }

  // Update all the bullets
  for(var i=0; i<bullets.length; i++) {
	  var bullet = bullets[i];

	  switch(bullet.dir) {
	  case 'up': bullet.pos[1] -= bulletSpeed * dt; break;
	  case 'down': bullet.pos[1] += bulletSpeed * dt; break;
	  default:
		  bullet.pos[0] += bulletSpeed * dt;
	  }

	  // Remove the bullet if it goes offscreen
	  if(bullet.pos[1] < 0 || bullet.pos[1] > canvas.height ||
		 bullet.pos[0] > canvas.width) {
		  bullets.splice(i, 1);
		  i--;
	  }
  }

  // Update all the enemies
  for(var i=0; i<enemies.length; i++) {
	  enemies[i].pos[0] -= enemySpeed * dt;
	  enemies[i].sprite.update(dt);

	  // Remove if offscreen
	  if(enemies[i].pos[0] + enemies[i].sprite.size[0] < 0) {
		  enemies.splice(i, 1);
		  i--;
	  }
  }

  // Update all the explosions
  for(var i=0; i<explosions.length; i++) {
      explosions[i].sprite.update(dt);

      // Remove if animation is done
      if(explosions[i].sprite.done) {
        explosions.splice(i, 1);
        i--;
      }
  }

  // Update all the lootAmmo
  for(var i=0; i<lootAmmo.length; i++) {
    lootAmmo[i].sprite.update(dt);

    // Remove if taken
    if(lootAmmo[i].looted) {
      lootAmmo.splice(i, 1);
      i--;
    }
  }

	// Update all the lootArmor
  for(var i=0; i<lootArmor.length; i++) {
    lootArmor[i].sprite.update(dt);

    // Remove if taken
    if(lootArmor[i].looted) {
      lootArmor.splice(i, 1);
      i--;
    }
  }

  // Update the lvlUp
  if (lvlUp){
  	lvlUp.sprite.update(dt);  	
  	if(lvlUp.looted) {
  		lvlUp = false;
    }
  }
}

// Collisions
function checkCollisions() {
  checkBounds(player);
  if (boss.sprite) {
  	checkBounds(boss);
  } 
  
  // Run collision detection for all enemies and bullets
  for(var i=0; i<enemies.length; i++) {
	  var pos = enemies[i].pos;
	  var size = enemies[i].sprite.size;

	  for(var j=0; j<bullets.length; j++) {
		  var pos2 = bullets[j].pos;
		  var size2 = bullets[j].sprite.size;

		  if(boxCollides(pos, size, pos2, size2)) {
			  // Remove the enemy
			  enemies.splice(i, 1);
			  i--;

			  // Add score
			  score += 100;

			  // Add loot
			  if (score >= scoreForBoss && enemies.length == 0 && !lvlUp && player.level == 1) {
			  	lvlUp = {
			  		pos:[pos[0],zeroPointY-15],
			  		sprite: new Sprite("img/sprites.png",
			  											 [32,183],
			  												[15,15]),
			  		looted: false
			  	};
			  } else {
			  	if(getRandomInt(1,2) == 1) {
			  		lootAmmo.push({
			  			pos:[pos[0],zeroPointY-15],
			  			sprite: new Sprite("img/sprites.png",
			  												 [0,183],
			  												 [15,15]),
			  			looted: false
			  		});
			  	} else {
			  		lootArmor.push({
			  			pos:[pos[0],zeroPointY-15],
			  			sprite: new Sprite("img/sprites.png",
			  												 [16,183],
			  												 [15,15]),
			  			looted: false
			  		});
			  	}			  	
			  }

			  // Add an explosion
			  explosions.push({
				  pos: pos,
				  sprite: new Sprite('img/sprites.png',
									 [0, 200],
									 [39, 39],
									 16,
									 [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
									 null,
									 true)
			  });

			  // Remove the bullet and stop this iteration
			  bullets.splice(j, 1);
			  break;
		  }
	  }

	  if(boxCollides(pos, size, player.pos, player.sprite.size)) {
	  	if (!player.armor) {
		  	gameOver();	  		
	  	} else {
	  		// Remove the enemy
			  enemies.splice(i, 1);
			  i--;
			  player.armor = false;
			  if (player.level == 1) {
	  			player.sprite.pos = [0,0];
			  } else {
			  	player.sprite.pos = [0,77];		
			  }
	  	}
	  }
  }

  // Check ammunition
  for(var i=0; i<lootAmmo.length; i++) {
		var pos = lootAmmo[i].pos;
		var size = lootAmmo[i].sprite.size;
  	if (boxCollides(pos, size, player.pos, player.sprite.size)) {
	 		ammunition += 2;
	 		lootAmmo[i].looted = true;
		}
	}

	// Check lvlUp
	if (lvlUp) {
		var pos = lvlUp.pos;
		var size = lvlUp.sprite.size;
		if (boxCollides(pos, size, player.pos, player.sprite.size)) {
			player.level = 2;
			// Skin change
			player.sprite.size = [63,36];
			if (player.armor) {
				player.sprite.pos = [126,77];				
			} else {
				player.sprite.pos = [0,77];
			}
			player.pos[1] = zeroPointY-player.sprite.size[1];
			lvlUp.looted = true;
		}		
	}

	// Check armor
	for(var i=0; i<lootArmor.length; i++) {
		var pos = lootArmor[i].pos;
		var size = lootArmor[i].sprite.size;
  	if (boxCollides(pos, size, player.pos, player.sprite.size)) {
	 		player.armor = true;
	 		if (player.level == 2) {
	 			player.sprite.pos = [126,77];		
	 		} else {
	 			player.sprite.pos = [112,0];
	 		}	 		
	 		lootArmor[i].looted = true;
		}
	}
}

function boxCollides(pos, size, pos2, size2) {
	return collides(pos[0], pos[1],
					pos[0] + size[0], pos[1] + size[1],
					pos2[0], pos2[1],
					pos2[0] + size2[0], pos2[1] + size2[1]);
}

function collides(x, y, r, b, x2, y2, r2, b2) {
	return !(r <= x2 || x > r2 ||
			 b <= y2 || y > b2);
}

function checkBounds(entity) {
  // Check bounds
  if(entity.pos[0] < 0) {
		entity.pos[0] = 0;
  }
  else if(entity.pos[0] > canvas.width - entity.sprite.size[0]) {
		entity.pos[0] = canvas.width - entity.sprite.size[0];
  }

  // if(player.pos[1] < 0) {
  //     player.pos[1] = 0;
  // }
  // else if(player.pos[1] > canvas.height - player.sprite.size[1]) {
  //     player.pos[1] = canvas.height - player.sprite.size[1];
  // }
}

// Draw everything
function render() {
  ctx.fillStyle = "#99d7df";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render the player if the game isn't over
  if(!isGameOver) {
		renderEntity(player);
  }

  //Render the boss
  if (boss.sprite) {
  	renderEntity(boss);
  }

  renderEntities(ground);
  renderEntities(bullets);
  renderEntities(enemies);
  renderEntities(lootAmmo);
  renderEntities(lootArmor);
  if (lvlUp) {
  	renderEntity(lvlUp);
  }
  renderEntities(explosions);
};

function renderEntities(list) {
	for(var i=0; i<list.length; i++) {
		renderEntity(list[i]);
	}    
}

function renderEntity(entity) {
  ctx.save();
  ctx.translate(entity.pos[0], entity.pos[1]);
  entity.sprite.render(ctx);
  ctx.restore();
}

// Game over
function gameOver() {
  document.getElementById('game-over').style.display = 'block';
  document.getElementById('game-over-overlay').style.display = 'block';
  isGameOver = true;
}

// Reset game to original state
function reset() {
  document.getElementById('game-over').style.display = 'none';
  document.getElementById('game-over-overlay').style.display = 'none';
  isGameOver = false;
  gameTime = 0;

  score = 0;
  ammunition = 10;
  player.level = 1;
  player.armor = false;

  enemies = [];
  bullets = [];  
  lootAmmo = [];
  lootArmor = [];
  lvlUp = false;

  boss = {};
 
  player.sprite.size = [55, 34];
  player.sprite.pos = [0, 0];
  player.pos = [50, zeroPointY-player.sprite.size[1]];
};
