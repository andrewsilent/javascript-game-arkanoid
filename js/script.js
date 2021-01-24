class Settings {
    constructor(maxWidth = document.documentElement.clientWidth, maxHeight = document.documentElement.clientHeight) {
        this.levelGutter = 2;
        this.levelWidth = Math.round(maxWidth > 800 ? 800 : maxWidth);
        this.levelHeight = Math.round(maxHeight > 800 ? 800 : maxHeight);
        this.levelX = 0;
        this.levelY = 0;
        this.brickRowMax = 10;
        this.brickColMax = 30;
        this.brickGutter = 2;
        this.brickWidth = Math.round(this.levelWidth / 10 - (this.brickGutter + this.levelGutter / 10));
        this.brickHeight = Math.round(this.levelHeight / 30 - this.brickGutter);
        this.brickColorScheme = [["transparent", "transparent", "transparent", "transparent"], ["#017374", "#2B898A", "#015859", "#000000"], ["#2E5873", "#3D7699", "#1F3B4D", "#000000"]];
        this.isLevelLoaded = false;
        this.isLevelStarted = false;
        this.isLevelPaused = false;
        this.mouseX = undefined;
        this.keyPause = 'Escape';
    }
}

class Sound {
    constructor() {
        this.theme = 'techno';
    }
    static hit() {
        let sound = new Audio('./sounds/hit.mp3');
        sound.volume = 0.2;
        sound.play();
    }
    static reflect() {
        let sound = new Audio('./sounds/reflect.mp3');
        sound.volume = 0.1;
        sound.play();
    }
    static lost() {
        let sound = new Audio('./sounds/lost.wav');
        sound.volume = 0.1;
        sound.play();
    }
}

class Layers {
    constructor() {
        this.static = null;
        this.regular = null;
        this.dynamic = null;
        this.staticDrawRequest = true;
        this.regularDrawRequest = true;
        this.dynamicDrawRequest = true;
    }

    set static(v) {
        this._static = document.querySelector('.static');
        this._static.width = settings.levelWidth;
        this._static.height = settings.levelHeight;
    }

    get static() {
        return this._static;
    }

    set regular(v) {
        this._regular = document.querySelector('.regular');
        this._regular.width = settings.levelWidth;
        this._regular.height = settings.levelHeight;
    }

    get regular() {
        return this._regular;
    }

    set dynamic(v) {
        this._dynamic = document.querySelector('.dynamic');
        this._dynamic.width = settings.levelWidth;
        this._dynamic.height = settings.levelHeight;
    }

    get dynamic() {
        return this._dynamic;
    }

    set staticDrawRequest(v) {
        this._staticDrawRequest = v;
    }

    get staticDrawRequest() {
        return this._staticDrawRequest;
    }

    set regularDrawRequest(v) {
        this._regularDrawRequest = v;
    }

    get regularDrawRequest() {
        return this._regularDrawRequest;
    }

    set dynamicDrawRequest(v) {
        this._dynamicDrawRequest = v;
    }

    get dynamicDrawRequest() {
        return this._dynamicDrawRequest;
    }

    update() {
        this.redrawIfNeed();
    }

    redrawIfNeed() {
        if (this.staticDrawRequest) {
            renderLevel(this._static);
            this.staticDrawRequest = false;
        }
        if (this.regularDrawRequest) {
            renderBricks(this._regular);
            this.regularDrawRequest = false;
        }
        if (this.dynamicDrawRequest) {
            renderBall(this._dynamic);
            renderPlayer(this._dynamic);
            this.dynamicDrawRequest = false;
        }
    }
}

class Level {
    constructor(levelDifficulty = 1) {
        this.levelDifficulty = levelDifficulty;
        this.x = settings.levelX;
        this.y = settings.levelY;
        this.strokeColor = "#000000";
        this.fillColor = "rgba(200,200,200,0.7)";
        this.bricks = [];
    }

    update() {
        this.updateBricks();
    }

    updateBricks() {
        level.bricks.forEach(row => row.forEach((brick, j, object) => {
            brick
                ? brick.strength > 0
                    ? brick.update()
                    : object.splice(j, 1, null)
                : null
        }));
    }

    generateBricks() {
        let symmetryMode = true;
        let minRowsCount = 1;
        let minBricksCount = 30;
        let bricksCount = 0;
        let rowLength = Math.floor(settings.levelWidth / settings.brickWidth);
        while (this.bricks.length < minRowsCount) {
            if (this.rowRandomizer()) {
                this.bricks.push([]);
                minRowsCount++;
                continue;
            }
            const prototype = [];
            while (prototype.length < rowLength) {
                prototype.push(this.colRandomizer());
            }
            symmetryMode ? prototype.splice(prototype.length / 2, prototype.length, ...prototype.slice(0, prototype.length / 2).reverse()) : prototype;
            const row = prototype.map((e, i) => (e) ? e = new Brick(this.bricks.length, i, e) : null);
            bricksCount += row.filter(Boolean).length;
            bricksCount < minBricksCount ? minRowsCount++ : minRowsCount;
            this.bricks.push(row);
        }
    }

    rowRandomizer() {
        return Math.random() < 0.25;
    }

    colRandomizer(i, j) {
        return Math.random() < 0.25
            ? null
            : Math.random() < 0.25
                ? 2
                : 1;
    }
}

class BrickProto {
    constructor(i, j) {
        this.width = Math.round(settings.levelWidth / 10 - (settings.brickGutter + settings.levelGutter / 10));
        this.height = Math.round(settings.levelHeight / 30 - settings.brickGutter);
        this.i = i;
        this.j = j;
        this.x = settings.levelX + settings.levelGutter + settings.brickGutter * this.j + this.width * this.j;
        this.y = settings.levelY + settings.levelGutter + settings.brickGutter * this.i + this.height * this.i;
    }

    set j(v) {
        this._j = v;
    }

    get j() {
        return this._j;
    }

    set i(v) {
        this._i = v;
    }

    get i() {
        return this._i;
    }
}

class Brick extends BrickProto {
    constructor(i, j, strength) {
        super(i, j);
        this.strength = strength;
        this.hasBonus = false;
        this.colorScheme = undefined;
    }

    set strength(v) {
        this._strength = v;
    }

    get strength() {
        return this._strength;
    }

    set colorScheme(v) {
        this._colorScheme = v || settings.brickColorScheme[this.strength];
    }

    get colorScheme() {
        return this._colorScheme;
    }

    update() {
        this.collizionDetection();
    }

    collizionDetection() {
        if (this.leftImpact() || this.rightImpact()) { // smell - зона ответственности Ball попала в другое место
            ball.reflectHorizontal();
            this.hit();
        }
        if (this.topImpact() || this.bottomImpact()) {
            ball.reflectVertical();
            this.hit();
        }
    }

    bottomImpact() {
        if (this.isInHorizontalRange() && ball.y > this.y) { // мяч летит снизу вверх
            return ball.y - ball.radius <= this.y + this.height;
        }
    }
    topImpact() {
        if (this.isInHorizontalRange() && ball.y < this.y + this.height) { // мяч летит сверху вниз
            return ball.y + ball.radius >= this.y;
        }
    }
    leftImpact() {
        if (this.isInVerticalRange() && ball.x < this.x + this.width) { // мяч летит слева направо
            return ball.x + ball.radius >= this.x;
        }
    }
    rightImpact() {
        if (this.isInVerticalRange() && ball.x > this.x) { // мяч летит справа налево
            return ball.x - ball.radius <= this.x + this.width;
        }
    }

    isInHorizontalRange() { // по горизонтали мяч находится в пределах кирпича
        return ball.x <= this.x + this.width && ball.x >= this.x;
    }
    isInVerticalRange() { // по вертикали мяч находится в пределах кирпича
        return ball.y <= this.y + this.height && ball.y >= this.y;
    }

    hit() {
        this.strength -= 1;
        this.colorScheme = settings.brickColorScheme[this.strength];
        layers.regularDrawRequest = true;
        Sound.hit();
    }
}

class Player {
    constructor() {
        this.width = 120;
        this.height = 22;
        this.x = settings.levelX + (settings.levelWidth / 2) - this.width / 2;
        this.y = settings.levelY + settings.levelHeight - settings.levelGutter * 4 - this.height;
    }

    update() {
        this.movement();
    }

    movement() {
        let CANVAS_X = Math.round(layers.static.getBoundingClientRect().left);
        if (settings.mouseX !== this.x + CANVAS_X + this.width / 2 && player.x > settings.levelX && player.x + player.width < settings.levelX + settings.levelWidth) {
            layers.dynamicDrawRequest = true;
        }
        this.x = settings.mouseX - CANVAS_X - this.width / 2 || settings.levelX + (settings.levelWidth / 2) - this.width / 2;
        if (player.x < settings.levelX) {
            player.x = settings.levelX;
        }
        if (player.x + player.width > settings.levelX + settings.levelWidth) {
            player.x = settings.levelX + settings.levelWidth - player.width;
        }
    }
}

class Ball {
    constructor() {
        this.radius = 10;
        this.x = player.x + this.radius;
        this.y = player.y - this.radius;
        this.vx = -2;
        this.vy = -3.5;
        this.isDead = false;
    }

    set x(v) {
        this._x = v;
    }

    get x() {
        return this._x;
    }

    set y(v) {
        this._y = v;
    }

    get y() {
        return this._y;
    }

    get mass() {
        let density = 1;
        return density * Math.PI * this.radius * this.radius;
    }

    get v() {
        return [this.vx, this.vy];
    }

    set isDead(boolean) {
        this._isDead = boolean;
    }

    get isDead() {
        return this._isDead;
    }

    update() {
        this.movement();
        this.touchDown();
        this.wallReflect();
    }

    movement() {
        this.x = this.x + this.vx;
        this.y = this.y + this.vy;
        layers.dynamicDrawRequest = true;
    }

    reflectVertical() {
        this.vy = -this.vy;
    }

    reflectHorizontal() {
        this.vx = -this.vx;
    }

    touchDown() {
        if (this.x - this.radius > player.x && this.x + this.radius < player.x + player.width) {
            if (this.y + this.radius > player.y && !this.isDead) {
                this.reflectVertical();
                Sound.reflect();
            }
        }
    }

    wallReflect() {
        if (this.x - this.radius < settings.levelX || this.x + this.radius > settings.levelX + settings.levelWidth) {
            this.reflectHorizontal();
            Sound.reflect();
        }
        if (this.y - this.radius < settings.levelY) {
            this.reflectVertical();
            Sound.reflect();
        }
        if (this.y - this.radius > settings.levelY + settings.levelHeight && !this.isDead) {
            this.isDead = true;
            Sound.lost();
            this.vx = 0;
            this.vy = 0;
        }
    }
}

function run() {
    // render();
    update();
    animate();
}

function update() {
    controls();
    layers.update();
    level.update();
    player.update();
    ball.update();
}

function animate() {
    requestAnimationFrame(run);
}

function renderLevel(canvas) {
    ctx = canvas.getContext('2d');
    ctx.clearRect(settings.levelX, settings.levelY, settings.levelWidth, settings.levelHeight);
    ctx.strokeStyle = level.strokeColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(settings.levelX, settings.levelY, settings.levelWidth, settings.levelHeight);
    ctx.fillStyle = level.fillColor;
    ctx.fillRect(settings.levelX, settings.levelY, settings.levelWidth, settings.levelHeight);
}

function renderBricks(canvas) {
    ctx = canvas.getContext('2d');
    ctx.clearRect(settings.levelX, settings.levelY, settings.levelWidth, settings.levelHeight);
    ctx.lineWidth = 0.1;
    level.bricks.forEach(row => row.forEach(brick => {
        if (brick) {
            [baseColor, topColor, bottomColor, strokeColor] = brick.colorScheme;
            ctx.shadowColor = '#666666';
            ctx.shadowOffsetY = 2;
            ctx.shadowBlur = 5;
            ctx.fillStyle = baseColor;
            ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            ctx.strokeStyle = strokeColor;
            ctx.shadowColor = 'transparent';
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
            // top side
            ctx.beginPath();
            ctx.moveTo(brick.x, brick.y);
            ctx.lineTo(brick.x + 20, brick.y + settings.brickHeight / 2);
            ctx.lineTo(brick.x + settings.brickWidth - 20, brick.y + settings.brickHeight / 2);
            ctx.lineTo(brick.x + settings.brickWidth, brick.y);
            ctx.closePath();
            ctx.fillStyle = topColor;
            ctx.stroke();
            ctx.fill();
            // bottom side
            ctx.beginPath();
            ctx.moveTo(brick.x, brick.y + settings.brickHeight);
            ctx.lineTo(brick.x + 20, brick.y + settings.brickHeight / 2);
            ctx.lineTo(brick.x + settings.brickWidth - 20, brick.y + settings.brickHeight / 2);
            ctx.lineTo(brick.x + settings.brickWidth, brick.y + settings.brickHeight);
            ctx.closePath();
            ctx.fillStyle = bottomColor;
            ctx.stroke();
            ctx.fill();
        }
    }));
}

function renderPlayer(canvas) {
    let ctx = canvas.getContext('2d');
    // center of player
    let gradient = ctx.createLinearGradient(player.x, player.y, player.x, player.y + player.height);
    gradient.addColorStop(0.2, '#888888');
    gradient.addColorStop(0.4, '#CCCCCC');
    gradient.addColorStop(0.8, '#666666');
    ctx.shadowColor = '#333333';
    ctx.shadowOffsetY = 5;
    ctx.shadowBlur = 10;
    ctx.fillStyle = gradient;
    ctx.fillRect(player.x + 20, player.y, player.width - 40, player.height);
    ctx.beginPath();
    ctx.moveTo(player.x + 20, player.y);
    ctx.lineTo(player.x + player.width - 20, player.y);
    ctx.lineTo(player.x + player.width - 20, player.y + player.height);
    ctx.lineTo(player.x + 20, player.y + player.height);
    ctx.closePath();
    ctx.lineWidth = 0.1;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    // line#1 at center of player
    ctx.beginPath();
    ctx.moveTo(player.x + 23, player.y + 9);
    ctx.lineTo(player.x + 45, player.y + 9);
    ctx.lineTo(player.x + 55, player.y + 15);
    ctx.lineTo(player.x + player.width - 55, player.y + 15);
    ctx.lineTo(player.x + player.width - 45, player.y + 9);
    ctx.lineTo(player.x + player.width - 23, player.y + 9);
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    // line#2 at center of player
    ctx.beginPath();
    ctx.moveTo(player.x + 23, player.y + 8);
    ctx.lineTo(player.x + 45, player.y + 8);
    ctx.lineTo(player.x + 55, player.y + 14);
    ctx.lineTo(player.x + player.width - 55, player.y + 14);
    ctx.lineTo(player.x + player.width - 45, player.y + 8);
    ctx.lineTo(player.x + player.width - 23, player.y + 8);
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#333333';
    ctx.stroke();

    // corners style
    gradient = ctx.createLinearGradient(player.x, player.y, player.x, player.y + player.height);
    gradient.addColorStop(0.1, '#993333');
    gradient.addColorStop(0.4, '#CC9999');
    gradient.addColorStop(0.45, '#CCCCCC');
    gradient.addColorStop(0.55, '#AA4444');
    gradient.addColorStop(0.8, '#663333');
    gradient.addColorStop(1, '#444444');
    ctx.fillStyle = gradient;
    ctx.lineWidth = 0.2;
    ctx.strokeStyle = '#000000';
    // left corner
    ctx.beginPath();
    ctx.moveTo(player.x + 20, player.y);
    ctx.lineTo(player.x + 15, player.y);
    ctx.arcTo(player.x, player.y, player.x, player.y + 20, 5);
    ctx.lineTo(player.x, player.y + player.height - 5);
    ctx.arcTo(player.x, player.y + player.height, player.x + 20, player.y + player.height, 5);
    ctx.lineTo(player.x + 20, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // right corner
    ctx.beginPath();
    ctx.moveTo(player.x + player.width - 20, player.y);
    ctx.lineTo(player.x + player.width - 5, player.y);
    ctx.arcTo(player.x + player.width, player.y, player.x + player.width, player.y + 20, 5);
    ctx.lineTo(player.x + player.width, player.y + player.height - 5);
    ctx.arcTo(player.x + player.width, player.y + player.height, player.x + player.width - 20, player.y + player.height, 5);
    ctx.lineTo(player.x + player.width - 20, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // lines near corners style
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#000000';
    // line near left corner
    ctx.beginPath();
    ctx.moveTo(player.x + 20, player.y);
    ctx.lineTo(player.x + 20, player.y + player.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(player.x + 20, player.y);
    ctx.lineTo(player.x + 20, player.y + player.height);
    ctx.stroke();
    // line near right corner
    ctx.beginPath();
    ctx.moveTo(player.x + player.width - 20, player.y);
    ctx.lineTo(player.x + player.width - 20, player.y + player.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(player.x + player.width - 20, player.y);
    ctx.lineTo(player.x + player.width - 20, player.y + player.height);
    ctx.stroke();
}

function renderBall(canvas) {
    ctx = canvas.getContext('2d');
    ctx.clearRect(settings.levelX, settings.levelY, settings.levelWidth, settings.levelHeight);
    let gradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0, ball.x - 2, ball.y - 2, 10);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(.1, '#CCCCCC');
    gradient.addColorStop(0.5, '#555555');
    ctx.fillStyle = gradient;
    ctx.lineWidth = 0.2;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI, false);
    ctx.shadowColor = '#333333';
    ctx.shadowOffsetY = 5;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.stroke();
}

function controls() {
    document.onmousemove = function (e) {
        settings.mouseX = e.clientX;
    }
    document.oncontextmenu = function () {
        return false;
    }
    document.onkeydown = function (e) {
        e = e || window.event;
        let isEscape = false;
        isEscape = (e.key === settings.keyPause);
        if (isEscape) {
            alert("Pause");
        }
    }
}

function init() {
    document.body.appendChild(document.createElement('div')).classList.add('wrapper');
    document.querySelector('.wrapper').appendChild(document.createElement('div')).classList.add('container');
    const container = document.querySelector('.container');
    container.appendChild(document.createElement('canvas')).classList.add('static');
    container.appendChild(document.createElement('canvas')).classList.add('regular');
    document.querySelector('.regular').setAttribute('style', 'position: absolute; top: 0; left: 0');
    container.appendChild(document.createElement('canvas')).classList.add('dynamic');
    document.querySelector('.dynamic').setAttribute('style', 'position: absolute; top: 0; left: 0');
    settings = new Settings();
    layers = new Layers();
    level = new Level();
    level.generateBricks();
    player = new Player();
    ball = new Ball();
    run();
}

init();