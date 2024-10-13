(function () {
  //Get canvas and context
  var c = document.getElementById("canvas"),
    ctx = c.getContext("2d");

  //Load assets
  var bgImg = loadImage("assets/background.jpg", 640, 480),
    playerImg = loadImage("assets/player.png", 192, 64),
    enemyUpImg = loadImage("assets/enemy_up.png", 64, 316),
    enemyDownImg = loadImage("assets/enemy_down.png", 64, 316);

  var pointAudio = new Audio("assets/point.mp3"),
    loseAudio = new Audio("assets/lose.mp3");

  //Helper methods
  function loadImage(src, width, height) {
    var img = new Image(width, height);
    img.src = src;
    return img;
  }

  function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  var textAlpha = (function () {
    var alpha = 1,
      shouldIncrease = false;
    return {
      fluctuate: function () {
        if (alpha < 0) shouldIncrease = true;
        if (alpha > 1) shouldIncrease = false;

        if (shouldIncrease) alpha += 0.02;
        else alpha -= 0.02;

        return alpha;
      },
      get: function () {
        return alpha;
      },
    };
  })();

  //Game constants
  var PLAYER_CONTROLS_ON = false;
  var GAME_PLAYING = false;

  //Classes & objects
  //******* Score counter object **********//
  var scoreCounter = {
    //state
    _score: 0,
    //methods
    increaseScore: function () {
      this._score++;
      pointAudio.play();
    },
    getScore: function () {
      return this._score;
    },
    reset: function () {
      this._score = 0;
    },
  };

  //******* Background Constructor **********//
  function Background(x, y, speed, img) {
    this.x = x || 0;
    this.y = y || 0;
    this.img = img || bgImg;
    this.speed = speed || 1;
  }
  Background.prototype = {
    move: function () {
      this.x -= this.speed;
      if (this.x <= -this.img.width) {
        this.x = c.width;
      }
    },
  };

  // Explosion sprite
  var explosion = {
    images: [], // Array to hold the explosion images
    x: 0,
    y: 0,
    visible: false, // Only visible upon collision
    width: 192, // Size of explosion (if applicable)
    height: 192, // Size of explosion (if applicable)
    frames: 7, // Number of frames
    currentFrame: 0,
    frameDelay: 7,
    frameCounter: 0,

    // Function to load images
    loadImages: function (imagePaths) {
      for (var i = 0; i < this.frames; i++) {
        var img = new Image();
        img.src = imagePaths[i]; // Set the source to the path of the image
        this.images.push(img); // Add image to the array
      }
    },

    // Function to update animation
    update: function () {
      if (this.visible) {
        this.frameCounter++;
        if (this.frameCounter >= this.frameDelay) {
          this.currentFrame = (this.currentFrame + 1) % this.frames; // Loop through frames
          this.frameCounter = 0; // Reset counter
        }
      }
    },

    // Function to draw the current frame
    draw: function (context) {
      if (this.visible) {
        context.drawImage(
          this.images[this.currentFrame],
          this.x,
          this.y,
          this.width,
          this.height
        );
      }
    },
  };
  // Example usage: Load images
  var imagePaths = [
    "./assets/explosion_1.png",
    "./assets/explosion_2.png",
    "./assets/explosion_3.png",
    "./assets/explosion_4.png",
    "./assets/explosion_5.png",
    "./assets/explosion_6.png",
    "./assets/explosion_7.png",
  ];

  explosion.loadImages(imagePaths);

  // Load the explosion image (you can adjust the path accordingly)
  //   explosion.img.src = "./assets/explosion.png";

  //******* Player Object **********//
  //fps locking vars
  var fpsCounter = Date.now(), //custom timer to restrict fps
    fps = 30;
  //free falling counter
  var fallingCounter = Date.now();
  var gameOver = false; // New variable to track game over state
  // To store the timeout function

  //Player
  player = {
    // physics
    velocity: 2,
    force: 0.15,
    // positional
    x: 70,
    y: 20,
    width: 128, // Increase width (previously 64)
    height: 128, // Increase height (previously 64)

    // methods remain unchanged
    jump: function () {
      this.velocity = -6;
    },
    fall: function () {
      var now = Date.now();
      if (now - fallingCounter > 1000 / fps) {
        if (this.velocity < 8) this.velocity += this.force;
        this.y += this.velocity;
      }
    },
    hasCollided: function () {
      var hasCollided = false;
      var playerX = this.x + this.width,
        playerTopY = this.y,
        playerBottomY = this.y + this.height;

      var enemyX = enemies[nextEnemyId].enemyDown.x + 40,
        enemyLookingDownY =
          enemies[nextEnemyId].enemyDown.y +
          enemies[nextEnemyId].enemyDown.img.height,
        enemyLookingUpY = enemies[nextEnemyId].enemyUp.y,
        enemyWidth = enemies[nextEnemyId].enemyDown.img.width;

      // Check collision with the enemy
      if (playerX > enemyX && playerX < enemyX + enemyWidth - 40) {
        if (playerTopY < enemyLookingDownY || playerBottomY > enemyLookingUpY) {
          hasCollided = true;

          // Set the explosion position to the point of collision
          explosion.x = this.x;
          explosion.y = this.y;
          explosion.visible = true; // Make the explosion visible
          explosion.currentFrame = 0; // Reset the animation frame

          if (!gameOver) {
            // Check if game is not already over
            gameOver = true; // Set game over state
            loseAudio.play(); // Play lose audio

            // Reset game after 5 seconds
            resetTimeout = setTimeout(() => {
              resetGame();
              gameOver = false; // Reset game over state
              updateLoop = window.requestAnimationFrame(update); // Resume the update loop
            }, 5000); // 5000 milliseconds = 5 seconds
          }
        }
      }

      // Check boundary collisions
      if (playerBottomY < 0 || playerTopY > c.height) {
        hasCollided = true;

        // Set the explosion position for boundary collisions
        explosion.x = this.x;
        explosion.y = this.y;
        explosion.visible = true;
        explosion.currentFrame = 0;
      }

      return hasCollided;
    },
    reset: function () {
      this.velocity = 2;
      this.y = 20;
    },
    getNextFrame: function () {
      var now = Date.now();
      if (now - fpsCounter > 1000 / fps) {
        fpsCounter = now;
        this._currentFrame++;
        if (this._currentFrame > 2) this._currentFrame = 0;
      }
      return this._currentFrame;
    },
  };

  // Draw the explosion animation
  function drawExplosion() {
    if (explosion.visible && explosion.img.complete) {
      var frameWidth = explosion.img.width / explosion.frames;
      var frameX = explosion.currentFrame * frameWidth;

      // Draw the current frame of the explosion
      ctx.drawImage(
        explosion.img,
        frameX,
        0, // Source position in sprite sheet
        frameWidth,
        explosion.img.height, // Source size
        explosion.x,
        explosion.y, // Destination position
        explosion.width,
        explosion.height // Destination size
      );

      // Update the frame for animation
      explosion.frameCounter++;
      if (explosion.frameCounter >= explosion.frameDelay) {
        explosion.currentFrame++;
        explosion.frameCounter = 0;
      }

      // Hide explosion after animation finishes
      if (explosion.currentFrame >= explosion.frames) {
        explosion.visible = false;
        explosion.currentFrame = 0; // Reset current frame for next use
      }
    }
  }

  //******* Enemy Constructor **********//
  //constants
  var ENEMY_NUMBER = 5, //how many sets of enemies
    ENEMY_OFFSET = 300, //horizontal distance between obstacles
    ENEMY_DISTANCE = 150, //vertical opening between obstacles
    MAX_YOFFSET = 50,
    MIN_YOFFSET = -150;
  //Enemy IDs
  var nextEnemyId, lastEnemyId; // defined in setupEnemies()

  function Enemy(id, y, yOffset, imgDirectionIsUp, speed, img) {
    if (typeof id === "undefined")
      throw new Error("Parameter ID must be defined");
    this.id = id;
    this.imgDirectionIsUp =
      typeof imgDirectionIsUp === "undefined" ? true : imgDirectionIsUp;
    this.yOffset = yOffset || 0;

    this.x = c.width + id * ENEMY_OFFSET || 0;
    if (this.imgDirectionIsUp) this.y = y + ENEMY_DISTANCE + this.yOffset || 0;
    else this.y = y - ENEMY_DISTANCE + this.yOffset || 0;

    this.speed = speed || 3;
    this.img = img || (this.imgDirectionIsUp ? enemyUpImg : enemyDownImg);
  }
  Enemy.prototype = {
    move: function () {
      this.x -= this.speed;
      if (this.x <= -this.img.width && this.imgDirectionIsUp) {
        //Set x of this enemy set to next enemy set + enemy offset
        this.x = enemies[this.id].enemyDown.x =
          enemies[lastEnemyId].enemyUp.x + ENEMY_OFFSET;
        //Set new random Y
        this.yOffset = enemies[this.id].enemyDown.yOffset =
          randomIntFromInterval(MIN_YOFFSET, MAX_YOFFSET);
        //Update last enemy ID
        lastEnemyId = lastEnemyId === ENEMY_NUMBER - 1 ? 0 : lastEnemyId + 1;
      }
      if (
        this.id === nextEnemyId &&
        this.x + this.img.width < player.x + player.width
      ) {
        //Update next enemy ID
        nextEnemyId = nextEnemyId === ENEMY_NUMBER - 1 ? 0 : nextEnemyId + 1;
        //Increase the score
        if (PLAYER_CONTROLS_ON) scoreCounter.increaseScore();
      }
    },
  };

  //Main functions
  var updateLoop;
  function update() {
    draw();
    updateLoop = window.requestAnimationFrame(update);
  }

  function draw() {
    //Set font style
    ctx.font = "48px Raleway";
    //Clean canvas
    ctx.clearRect(0, 0, c.width, c.height);
    //Draw next frame with props
    drawBackground();

    // If game hasn't started or player lost show splash screen text
    if (!GAME_PLAYING) {
      ctx.strokeStyle = "rgba(0,0,0," + textAlpha.get() + ")";
      ctx.strokeText("Alla Hu Akbar", c.width / 2 - 230, 80);
      ctx.fillStyle = "rgba(255,255,255," + textAlpha.get() + ")";
      ctx.fillText("Alla Hu Akbar", c.width / 2 - 230, 80);
      textAlpha.fluctuate();
    }
    // If game is playing draw everything
    else {
      drawEnemies();
      drawPlayer();
      //Draw the score
      ctx.fillStyle = "black";
      ctx.strokeText(scoreCounter.getScore(), c.width / 2 - 11, 51);
      ctx.fillStyle = "white";
      ctx.fillText(scoreCounter.getScore(), c.width / 2 - 10, 50);
    }

    // Show explosion animation if there was a collision
    if (explosion.visible) {
      explosion.update();
      explosion.draw(ctx);
    }
  }

  //Instantiate, draw and animate backgrounds
  var bg1 = new Background(0, 0);
  var bg2 = new Background(c.width, 0);

  function drawBackground() {
    ctx.drawImage(bg1.img, bg1.x, bg1.y);
    ctx.drawImage(bg2.img, bg2.x, bg2.y);
    bg1.move();
    bg2.move();
  }

  //Instantiate and draw player
  // Modify the drawPlayer function to use a static image
  function drawPlayer() {
    // render player using a static image
    ctx.drawImage(playerImg, player.x, player.y, player.width, player.height); // player static image

    // move player (falling behavior remains the same)
    player.fall();

    // collision check
    if (player.hasCollided()) {
      bg1.speed = 0;
      bg2.speed = 0;
      // deactivate player controls
      PLAYER_CONTROLS_ON = false;

      explosion.x = player.x; // Set the explosion position to the player's position
      explosion.y = player.y; // Set the explosion position to the player's position
      explosion.visible = true; // Make the explosion visible
      explosion.currentFrame = 0; // Reset the animation frame

      // Set game over and hold for 5 seconds
      if (!gameOver) {
        gameOver = true;
        setTimeout(() => {
          resetGame();
          bg1.speed = 0;
          bg2.speed = 0;
          gameOver = false; // Reset game state
          GAME_PLAYING = true; // Resume game
          PLAYER_CONTROLS_ON = true; // Enable player controls
        }, 5000); // 5000 milliseconds = 5 seconds
      }

      // when player falls off screen, stop game
      if (player.y - player.height > c.height) GAME_PLAYING = false;
    }
  }

  //Set up initial enemy positions before rendering them
  var enemies = [];
  function setupEnemies() {
    nextEnemyId = 0;
    lastEnemyId = ENEMY_NUMBER - 1; //used to reposition enemies

    for (var i = 0; i < ENEMY_NUMBER; i++) {
      var yOffset = randomIntFromInterval(MIN_YOFFSET, MAX_YOFFSET);
      var enemySet = {
        enemyUp: new Enemy(i, c.height / 2, yOffset),
        enemyDown: new Enemy(i, 0, yOffset, false),
      };
      enemies[i] = enemySet;
    }
  }

  //Instantiate and draw enemies
  function drawEnemies() {
    for (var i = 0; i < enemies.length; i++) {
      ctx.drawImage(
        enemies[i].enemyUp.img,
        enemies[i].enemyUp.x,
        enemies[i].enemyUp.y
      );
      ctx.drawImage(
        enemies[i].enemyDown.img,
        enemies[i].enemyDown.x,
        enemies[i].enemyDown.y
      );
      enemies[i].enemyUp.move();
      enemies[i].enemyDown.move();
    }
  }

  //Reset game function
  function resetGame() {
    scoreCounter.reset();
    player.reset();
    setupEnemies();
    bg1.speed = 1; // Set background 1 speed back to 1
    bg2.speed = 1; // Set background 2 speed back to 1
  }

  //Register event handlers & kick off the game
  // Register event handlers & kick off the game
  window.onload = function () {
    // Listen for keydown events
    document.addEventListener("keydown", function (event) {
      // Check if spacebar (key code 32) is pressed
      if (event.code === "Space") {
        if (PLAYER_CONTROLS_ON) {
          player.jump();
        }
        if (!GAME_PLAYING) {
          resetGame();
          GAME_PLAYING = true;
          PLAYER_CONTROLS_ON = true;
        }
      }
    });

    update();
  };
})();
