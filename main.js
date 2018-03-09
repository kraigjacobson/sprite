//Aliases
var Application = PIXI.Application,
    Container = PIXI.Container,
    loader = PIXI.loader,
    resources = PIXI.loader.resources,
    TextureCache = PIXI.utils.TextureCache,
    Sprite = PIXI.Sprite,
    Rectangle = PIXI.Rectangle;

var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;
const FORWARDTHRUST = 300;
const BACKWARDTHRUST = 50;
const ROTATIONSPEED = 0.05;
const DAMAGEMULITPLIER = .1;
// const DAMPING = .1;
const ANGULARDAMPING = .3;
const DAMPING = 0;
// const ANGULARDAMPING = 0;
const ANCHOR = {
    x: 0.5,
    y: 0.5
}
const SPRITECOLUMNS = 14;
const SPRITEROWS = 10;
const SPRITEMASS = 1;
const SQUAREMASS = 10;


var N = 2,
    M = 2,
    d = 1.2,
    r = 0.3;

//Create a Pixi Application
var app = new Application({
        width: WIDTH,
        height: HEIGHT,
        antialias: true,
        transparent: false,
        resolution: 1
    }
);
window.addEventListener("resize",  function() {
    WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;
    app.renderer.resize(WIDTH, HEIGHT);
    background.width = WIDTH;
    background.height = HEIGHT;
});

//Add the canvas that Pixi automatically created for you to the HTML document
document.body.appendChild(app.view);

loader
    .add("images/sprite.png")
    .add("images/stars.jpg")
    .add("images/square.png")
    .load(init);

//Define any variables that are used in more than one function
var entities, state;
//Capture the keyboard arrow keys
var player;
var left = keyboard(37),
    up = keyboard(38),
    right = keyboard(39),
    down = keyboard(40),
    refresh = keyboard(116);
var world = null;
var crack = new Howl({
    src: ['SodaCan_03.mp3']
});
var crumple = new Howl({
    src: ['open.mp3']
});

function init() {
    // Create a physics world, where bodies and constraints live
    world = new p2.World({
        gravity:[0, 0]
    });

    entities = [];

    //Background
    background = new PIXI.extras.TilingSprite(
        resources["images/stars.jpg"].texture,
        app.screen.width,
        app.screen.height
    );
    app.stage.addChild(background);


    // Create circle bodies
    var square = new Sprite(resources["images/square.png"].texture);
    square.anchor.set(ANCHOR.x, ANCHOR.y);
    square.body = new p2.Body({
        mass: SQUAREMASS,
        position: [1000, -600],
        angularVelocity : 1
    });
    square.body.entity = square;
    square.body.addShape(new p2.Box({ height: 100, width: 50 }), [-25,0], 0);
    square.body.addShape(new p2.Box({ height: 100, width: 50 }), [25,0], 0);
    square.collision = function (thisShip, damage) {};
    world.addBody(square.body);
    app.stage.addChild(square);
    entities.push(square);


    for (var i=0; i<SPRITEROWS; i++) {
        for (var j=0; j<SPRITECOLUMNS; j++) {
            var entity = new Sprite(resources["images/sprite.png"].texture);
            entity.anchor.set(ANCHOR.x, ANCHOR.y);
            entity.body = new p2.Body({
                mass: SPRITEMASS,
                position: [20 + j * 50, -255 + i * 100]
            });
            entity.stats = {
                integrity: 100,
                damage: 1,
                armor: 1
            };
            entity.body.entity = entity;
            entity.body.damping = DAMPING;
            entity.body.angularDamping = ANGULARDAMPING;
            entity.body.addShape(new p2.Box({width: 25, height: 100, position: [0,0] }));
            entity.body.addShape(new p2.Box({width: 25, height: 100, position: [25,0] }));
            // entity.body.addShape(new p2.Box({height: 25, width: 25, vertices: [5,-45,-45,5] }));
            // entity.body.addShape(new p2.Box({height: 25, width: 25, vertices: [-45,-45,5,5] }));
            // entity.body.addShape(new p2.Box({height: 25, width: 25, vertices: [-45,5,5,-45] }));
            entity.collision = function (thisShip, damage) {
            };
            world.addBody(entity.body);
            app.stage.addChild(entity);
            entities.push(entity);
            entity.body.applyForce([5000,-3000]);
        }
    }

    world.on('beginContact', (data) => {
        if (data.bodyA && data.bodyB && data.bodyA.entity && data.bodyB.entity) {
            let thisShipMomentum = Math.magnitude(data.bodyA.velocity)*data.bodyA.mass;
            let otherShipMomentum = Math.magnitude(data.bodyB.velocity)*data.bodyB.mass;
            data.bodyA.entity.collision(data.bodyA, otherShipMomentum);
            data.bodyB.entity.collision(data.bodyB, thisShipMomentum);
            if (Math.random() < .001) {
                crack.play();
            }
            if (Math.random() < .001) {
                crumple.play();
            }
        }
    });

    player = entities[0];

    // Create an infinite ground plane body
    var ceiling = new p2.Body({
        mass: 0, // Setting mass to 0 makes it static
        position: [0, 0],
        angle: Math.PI
    });
    var floor = new p2.Body({
        mass: 0, // Setting mass to 0 makes it static
        position: [0, -HEIGHT]
    });
    var leftWall = new p2.Body({
        mass: 0, // Setting mass to 0 makes it static
        position: [0, 0],
        angle: (3 * Math.PI) / 2
    });
    var rightWall = new p2.Body({
        mass: 0, // Setting mass to 0 makes it static
        position: [WIDTH, 0],
        angle: Math.PI / 2
    });
    var ceilingShape = new p2.Plane();
    var floorShape = new p2.Plane();
    var leftShape = new p2.Plane();
    var rightShape = new p2.Plane();
    ceiling.addShape(ceilingShape);
    floor.addShape(floorShape);
    leftWall.addShape(leftShape);
    rightWall.addShape(rightShape);
    world.addBody(ceiling);
    world.addBody(floor);
    world.addBody(leftWall);
    world.addBody(rightWall);

    //Set the game state
    state = play;

    //Start the game loop
    app.ticker.add(delta => gameLoop(delta));
}

function gameLoop(delta){

    //Update the current game state:
    state(delta);
}

// To animate the bodies, we must step the world forward in time, using a fixed time step size.
// The World will run substeps and interpolate automatically for us, to get smooth animation.
var fixedTimeStep = 1 / 8; // seconds
var maxSubSteps = 10; // Max sub steps to catch up with the wall clock
var lastTime;
function play(delta) {

    if (up.isDown) {
        var angle = -player.body.angle + Math.PI/2;
        player.body.applyForce([Math.cos(angle) * FORWARDTHRUST, Math.sin(angle) * FORWARDTHRUST]);
    }
    if (down.isDown) {
        var angle = -player.body.angle + Math.PI/2;
        player.body.applyForce([Math.cos(angle) * -BACKWARDTHRUST, Math.sin(angle) * -BACKWARDTHRUST]);
    }
    if (left.isDown) {
        player.body.angularVelocity += -ROTATIONSPEED;
    }
    if (right.isDown) {
        player.body.angularVelocity += ROTATIONSPEED;
    }
    if (refresh.isDown) {
        window.location.reload();
    }

    var deltaTime = lastTime ? (time - lastTime) / 1000 : 0;
    world.step(fixedTimeStep, deltaTime, maxSubSteps);

    for (var i=0; i<entities.length; i++) {
        var entity = entities[i];
        entity.x = entity.body.position[0];
        entity.y = -entity.body.position[1];
        entity.rotation = entity.body.angle;
    }
}

function keyboard(keyCode) {
    var key = {};
    key.code = keyCode;
    key.isDown = false;
    key.isUp = true;
    key.press = undefined;
    key.release = undefined;
    //The `downHandler`
    key.downHandler = event => {
        if (event.keyCode === key.code) {
            if (key.isUp && key.press) key.press();
            key.isDown = true;
            key.isUp = false;
        }
        event.preventDefault();
    };

    //The `upHandler`
    key.upHandler = event => {
        if (event.keyCode === key.code) {
            if (key.isDown && key.release) key.release();
            key.isDown = false;
            key.isUp = true;
        }
        event.preventDefault();
    };

    //Attach event listeners
    window.addEventListener(
        "keydown", key.downHandler.bind(key), false
    );
    window.addEventListener(
        "keyup", key.upHandler.bind(key), false
    );
    return key;
}

Math.magnitude = function(p1) {
    return Math.hypot(p1[0], p1[1]);
};
