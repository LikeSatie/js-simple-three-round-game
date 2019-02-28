'use strict';

class Vector {
    constructor(coordX = 0, coordY = 0) {
        this.x = coordX;
        this.y = coordY;
    }

    plus(vector) {
        if (!(vector instanceof Vector)) {
            throw new Error('Можно прибавлять к вектору только вектор типа Vector');
        }
        return new Vector(this.x + vector.x, this.y + vector.y);
    }

    times(multiplier) {
        return new Vector(this.x * multiplier, this.y * multiplier);
    }
}

class Actor {
    constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        if (!(pos instanceof Vector)) {
            throw new Error('Должно быть определено свойство pos, в котором размещен Vector');
        }

        if (!(size instanceof Vector)) {
            throw new Error('Должно быть определено свойство size, в котором размещен Vector');
        }

        if (!(speed instanceof Vector)) {
            throw new Error('Должно быть определено свойство speed, в котором размещен Vector');
        }

        this.pos = pos;
        this.size = size;
        this.speed = speed;
    }

    get type() {
        return 'actor';
    }

    act() {}

    get left() {
        return this.pos.x;
    }

    get right() {
        return this.pos.x + this.size.x;
    }

    get top() {
        return this.pos.y;
    }

    get bottom() {
        return this.pos.y + this.size.y;
    }

    isIntersect(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error('Не является персонажем');
        }
        if (actor === this) {
            return false;
        }
        if ((this.right > actor.left && this.left < actor.right) && (this.bottom > actor.top && this.top < actor.bottom)) {
            return true;
        } else {
            return false;
        }
    }
}

class Level {
    constructor(grid = [], actors = []) {
        for (const actor of actors) {
            if (actor.type === 'player') {
                this.player = actor;
                break;
            }
        }

        this.grid = grid;
        this.actors = actors;
        this.height = grid.length;
        this.width = 0;

        if (grid.length !== 0) {
            for (const arr of this.grid) {
                if (typeof arr != 'undefined') {
                    if (this.width < arr.length) {
                        this.width = arr.length;
                    }
                }
            }
        }

        this.status = null;
        this.finishDelay = 1;
    }

    isFinished() {
        return (this.status != null && this.finishDelay < 0);
    }

    actorAt(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error('Движущийся объект должен иметь тип Actor');
        }

        if (this.grid === undefined) {
            return undefined;
        }

        for (const act of this.actors) {
            if (typeof act != 'undefined' && actor.isIntersect(act)) {
                return act;
            }
        }
        return undefined;
    }

    obstacleAt(pos, size) {
        if (!(pos instanceof Vector)) {
            throw 'pos должен иметь тип Vector';
        }

        if (!(size instanceof Vector)) {
            throw 'size должен иметь тип Vector';
        }

        const xStart = Math.floor(pos.x);
        const xEnd = Math.ceil(pos.x + size.x);
        const yStart = Math.floor(pos.y);
        const yEnd = Math.ceil(pos.y + size.y);

        if (xStart < 0 || xEnd > this.width || yStart < 0) {
            return 'wall';
        }

        if (yEnd > this.height) {
            return 'lava';
        }

        for (let y = yStart; y < yEnd; y++) {
            for (let x = xStart; x < xEnd; x++) {
                const obstacle = this.grid[y][x];
                if (typeof obstacle !== 'undefined') {
                    return obstacle;
                }
            }
        }
        return;
    }

    removeActor(actor) {
        const indexActor = this.actors.indexOf(actor);
        if (indexActor != -1) {
            this.actors.splice(indexActor, 1);
        }
    }

    noMoreActors(type) {
        if (this.actors) {
            for (const actor of this.actors) {
                if (actor.type === type) {
                    return false;
                }
            }
        }
        return true;
    }

    playerTouched(type, actor) {
        if (this.status != null) {
            return;
        }

        if (type === 'lava' || type === 'fireball') {
            this.status = 'lost';
        }

        if (type === 'coin' && actor.type === 'coin') {
            this.removeActor(actor);
            if (this.noMoreActors('coin')) {
                this.status = 'won';
            }
        }
    }
}

class LevelParser {
    constructor(dictionary = {}) {
        this.dictionary = dictionary;
    }
    actorFromSymbol(symbol) {
        return this.dictionary[symbol];
    }
    obstacleFromSymbol(symbol) {
        switch (symbol) {
            case 'x':
                return 'wall';
            case '!':
                return 'lava';
        }
    }
    createGrid(plan) {
        return plan.map(elem => elem.split('').map(this.obstacleFromSymbol));
    }
    createActors(plan) {
        const actors = [];
        for (let i = 0; i < plan.length; i++) {
            for (let k = 0; k < plan[i].length; k++) {
                const NewActor = this.actorFromSymbol(plan[i][k]);
                if (typeof NewActor === 'function') {
                    const newActor = new NewActor(new Vector(k, i));
                    if (newActor instanceof Actor) {
                        actors.push(newActor);
                    }
                }
            }
        }
        return actors;
    }
    parse(plan) {
        return new Level(this.createGrid(plan), this.createActors(plan));
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
        super(pos, undefined, speed);
    }

    get type() {
        return 'fireball';
    }

    getNextPosition(time = 1) {
        if (!time) {
            return this.pos;
        }
        return this.pos.plus(this.speed.times(time));
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);
    }

    act(time, level) {
        const nextPos = this.getNextPosition(time);
        if (!level.obstacleAt(nextPos, this.size)) {
            this.pos = nextPos;
        } else {
            this.handleObstacle();
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(2, 0));
    }
}

class VerticalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0, 2));
    }
}

class FireRain extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0, 3));
        this.initPos = pos;
    }

    handleObstacle() {
        this.speed = this.speed;
        this.pos = this.initPos;
    }
}

class Coin extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));

        this.initPos = new Vector(this.pos.x, this.pos.y);
        this.springSpeed = 8;
        this.springDist = 0.07;

        function getRandom(min, max) {
            return Math.random() * (max - min) + min;
        }

        this.spring = getRandom(0, 2 * Math.PI);
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }

    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.initPos.plus(this.getSpringVector());
    }

    act(time = 1) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos = new Vector(0, 0)) {
        pos.y += -0.5;
        super(pos, new Vector(0.8, 1.5), new Vector(0, 0));
    }

    get type() {
        return 'player';
    }
}

const schemas = [
    [
        '         ',
        '   z     ',
        '       z ',
        '    o o o',
        '    x x x',
        ' @       ',
        'xx   z   ',
        '!!!!!!!!!'
    ],
    [
        '      v  ',
        '  v      ',
        '         ',
        '        o',
        '    o   x',
        '@   x    ',
        'x        ',
        '!!!!!!!!!'
    ],
    ['         ',
        '         ',
        'o        ',
        '  f xf   ',
        '       xo',
        'x      xx',
        ' @       ',
        'xx  z    ',
        '!!!!!!!!!'
    ]
];
const actorDict = {
    '@': Player,
    'v': FireRain,
    'o': Coin,
    'f': HorizontalFireball,
    'z': VerticalFireball
}
const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
    .then(() => alert('Вы выиграли приз!'));