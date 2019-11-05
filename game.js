'use strict'
// import what we needed for the game
import {
    Game,
    Sprite,
    Canvas,
    Loop,
    Loader,
    Sound,
    Maths
} from 'craters.js'
import * as tf from '@tensorflow/tfjs';

var media = new Loader() // well use this for loading media
var audio = new Sound()
// derive our game from craters Game
class mygame extends Game {
    constructor(container, width, height) {
        super()
        // define some constants we'll need this later in the game
        this.state.size = {
            x: width,
            y: height
        } // game dimensions width and height
        this.state.pos = {
            x: 0,
            y: 0
        } // we'll use this to let the collider have an idea of the position of the game
        this.viewport = new Canvas(this.state.size.x, this.state.size.y, container) // this.viewport is a canvas element used to display our game
        this.context = this.viewport.context // get the context of the canvas // to be used for the actual drawings
        this.context.fillStyle = '#fff' // white font
        this.loop = new Loop(this, 60) // define the frame rate at which the game will be updated and rendered

        this.ball = (this.entities.push(new ball(this)) - 1) // save the index of the ball
        this.paddle = (this.entities.push(new paddle(this)) - 1) // save the index of the paddle
        this.bamboos = this.started = this.score = 0 // initial score , bamboos and state we'll set them all to zero
        window.addEventListener('resize', () => {
            this.viewport.resize(this, {
                x: window.innerWidth,
                y: window.innerHeight
            })
            this.context.fillStyle = '#fff' // white font // context was reset
        })
    }

    // the main game update loop
    update() {

        if (this.started < 1) return // cut the loop if the game isn't officially kicked off
        if (this.bamboos <= 0) this.newgame(((this.state.size.y / 2) / 53), ((this.state.size.x) / 138)) // no bamboo , add some

        super.update() // update every single entity
    }

    // the main rendering function of the game
    render() {
        this.viewport.clear() // clear the game context
        // listen for clicks and start the game if there's any
        document.addEventListener('click', () => {
            if(this.started >= 1) return;
            this.started++
            
            audio.play('theme', null, 0.5, true)
        })
        // else if the game isn't started draw the title image
        if (this.started < 1) {
            this.context.drawImage(media.fetch('./media/TapToPlay@3x.png'), (this.state.size.x - 300) / 2, (this.state.size.y - 180) / 2, 300, 180)
            return
        }
        // write the score board top left corner
        this.context.font = '2em Arial'
        this.context.fillText('SCORE: ️' + this.score, (16), (50), (this.state.size.x))

        super.render() // render every single entity
    }

    // this function respawns bamboos
    newgame(rows, cols) {
        // row by col add bamboo
        for (var row = 0; row < rows; row++) {
            for (var col = 0; col < cols; col++) {
                var index = (this.entities.push(new bamboo(this, {
                    x: (138 * col),
                    y: (53 * row)
                })) - 1)
                this.entities[index].id = index
                this.bamboos++
            }
        }
    }
}

// our ball entity ,
class ball extends Sprite {
    constructor(scope) {
        super(scope, {
            frames: [0],
            image: media.fetch('./media/ball@3x.png')
        })
        // assign some constants
        this.scope = scope // scope
        this.state.vel = {
            x: 350,
            y: -160
        } // initiatal velocity
        this.state.size = {
            x: 48,
            y: 48
        } // dimensions
        this.state.pos = {
            x: (scope.state.size.x / 2) - (this.state.size.x / 2),
            y: (scope.state.size.y / 2 - this.state.size.y)
        } // initial position
    }

    update() {
        super.update()
        // respond to collision with the edges of the viewport
        // by bouncing back `backwards`
        let paddle = this.scope.entities[this.scope.paddle];
        // X-axis collision
        if ((this.state.pos.x + this.state.size.x > this.scope.state.size.x)) {
            if (this.state.vel.x < 0) return
            this.state.vel.x *= -1
        }
        // Y-axis collision
        if ((this.state.pos.y + this.state.size.y > this.scope.state.size.y)) {
            if (this.state.vel.y < 0) return
            this.state.vel.y *= -1
            paddle.crash()
        }

        if ((this.state.pos.x < 0)) {
            if (this.state.vel.x > 0) return
            this.state.vel.x *= -1
        }
        // Y-axis collision
        if ((this.state.pos.y < 0)) {
            if (this.state.vel.y > 0) return
            this.state.vel.y *= -1
        }
        // collision with paddle
        if (Collision.detect(paddle, this)) {
            if (this.state.vel.y < 0) return
            this.state.vel.y *= -1
        }
    }
}

class bamboo extends Sprite {
    constructor(scope, pos) {
        super(scope, {
            frames: [0],
            image: media.fetch('./media/block@3x.png')
        })
        this.scope = scope
        this.state.size = {
            x: 138,
            y: 53
        }
        this.state.pos = {
            x: pos.x,
            y: pos.y
        }
        for (var i = 0; i < 10; i++) {
            this.entities.push(new particle(this.scope, {
                x: this.state.pos.x,
                y: this.state.pos.y
            }))
        }
    }

    update() {
        super.update()
        if (Collision.detect(this.scope.entities[this.scope.ball], this)) {
            this.scope.score += 10
            this.scope.bamboos--
            audio.play('pop')
            var id = this.id
            this.scope.entities = this.scope.entities.filter(function(i) {
                return i.id != id
            })
        }
    }
}

class particle extends Sprite {
    constructor(scope, pos) {
        super(scope, {
            frames: [0]
        })
        this.scope = scope
        this.state.image = media.fetch('./media/block_break01@3x.png')
        this.state.size = {
            x: 45,
            y: 35
        }
        this.state.pos = pos
        this.state.vel.y = (Math.random() - 0.5) * 600
        this.state.vel.x = (Math.random() - 0.5) * 600

        this.state.gravity.y = 0.25
        this.state.friction = {
            x: 0.005,
            y: 0.005
        }
    }

    update() {
        super.update()
        if ((this.state.pos.y + this.state.size.y > this.scope.state.size.y)) {
            if (this.state.vel.y < 0) return
            this.state.vel.y *= -1
        }

        // this.state.pos.y = Maths.boundary((this.state.pos.y), (this.state.size.y), (this.scope.state.size.y - (this.state.size.y)))
    }
}

class paddle extends Sprite {
    constructor(scope) {
        super(scope, {
            frames: [0],
            image: media.fetch('./media/paddle@3x.png')
        })
        this.scope = scope
        this.state.size = {
            x: 180,
            y: 69
        }

        this.trained = false;
        this.model = tf.sequential();
        // this.model.init();
        // adding the first hidden layer to the model using with 3 inputs ,
        // sigmoid activation function
        // and output of 6
        this.model.add(tf.layers.dense({
            inputShape: [4],
            activation: 'sigmoid',
            units: 8
        }))

        /* this is the second output layer with 6 inputs coming from the previous hidden layer
        activation is again sigmoid and output is given as 2 units 10 for not jump and 01 for jump
        */
        this.model.add(tf.layers.dense({
            inputShape: [8],
            activation: 'sigmoid',
            units: 2
        }))

        /* compiling the model using meanSquaredError loss function and adam 
        optimizer with a learning rate of 0.1 */
        this.model.compile({
            loss: 'meanSquaredError',
            optimizer: tf.train.adam(0.1)
        })

        this.training = {
            xs: [],
            ys: []
        }

        this.state.pos.x = ((this.scope.state.size.x / 2) - (this.state.size.x / 2))
        this.state.pos.y = ((this.scope.state.size.y) - (this.state.size.y))
    }

    crash() {
        let ball = this.scope.entities[this.scope.ball].state
        let paddle = this.state
        let action = (paddle.pos.x > ball.pos.x) ? [0, 1] : [1, 0];

        this.training.xs.push([ball.pos.x + (ball.size.x / 2), ball.pos.y, paddle.pos.x + (paddle.size.x / 2), paddle.pos.y])
        this.training.ys.push(action)

        this.train()
    }

    train() {
        return new Promise((resolve) => {
            // log into console that model will now be trained
            console.info('Training');
            // convert the inputs and labels to tensor2d format and  then training the model
            console.info(tf.tensor2d(this.training.xs))
            const train = this.model.fit(tf.tensor2d(this.training.xs), tf.tensor2d(this.training.ys));
            train.then(() => {
                this.trained = true;
            });
        });
    }

    predict() {
        return new Promise((resolve) => {
            let ball = this.scope.entities[this.scope.ball].state
            let paddle = this.state

            const prediction = this.model.predict(tf.tensor2d([
                [ball.pos.x + (ball.size.x / 2), ball.pos.y, paddle.pos.x + (paddle.size.x / 2), paddle.pos.y]
            ]))
            // the predict function returns a tensor we get the data in a promise as result
            // and based don result decide the action
            const predictionPromise = prediction.data();
            predictionPromise.then((result) => {

                if (result[1] > result[0]) {
                    // left
                    this.state.vel.x = -650;
                } else {
                    // right
                    this.state.vel.x = 650;
                }
                // console.log(JSON.stringify(result))
                this.state.pos.y = (this.scope.state.size.y - this.state.size.y)
            });
        });
    }

    update() {
        super.update()
        if (this.trained) this.predict();

        if ((this.state.pos.x < 0)) {
            if (this.state.vel.x > 0) return
            this.state.pos.x = 0
        }
        if ((this.state.pos.x + this.state.size.x > this.scope.state.size.x)) {
            if (this.state.vel.x < 0) return
            this.state.pos.x = (this.scope.state.size.x - this.state.size.x)
        }

    }
}

// Rect collision tests the edges of each rect to
// test whether the objects are overlapping the other
class Collision {
    static detect(collider, collidee) {
        // Store the collider and collidee edges
        var l1 = collider.state.pos.x
        var t1 = collider.state.pos.y
        var r1 = l1 + collider.state.size.x
        var b1 = t1 + collider.state.size.y

        var l2 = collidee.state.pos.x
        var t2 = collidee.state.pos.y
        var r2 = l2 + collidee.state.size.x
        var b2 = t2 + collidee.state.size.y

        // If the any of the edges are beyond any of the
        // others, then we know that the box cannot be
        // colliding
        if (b1 < t2 || t1 > b2 || r1 < l2 || l1 > r2) {
            return false
        }

        // If the algorithm made it here, it had to collide
        return true
    };
}

// preload all the media and start the game
// starting with the sound
// in a chain reaction kind of way
var backgroundsound = audio.load('theme', './media/music/theme.mp3', function() {
	var popSfx = audio.load('pop', './media/music/pop.ogg', function() {
	    // sound done go-ahead load the images
	    media.load([
	        './media/ball@3x.png',
	        './media/paddle@3x.png',
	        './media/block@3x.png',
	        './media/block_break01@3x.png',
	        './media/TapToPlay@3x.png'
	    ], function() {
	        // All done initiate our game
	        window.game = new mygame('#container', window.innerWidth, window.innerHeight, 60, true)
	    })
	})
})