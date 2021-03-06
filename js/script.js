class Settings {
    constructor() {
        this.levelWidth = document.documentElement.clientWidth > 842 ? 842 : document.documentElement.clientWidth;
        this.levelHeight = document.documentElement.clientHeight > 768 ? 768 : document.documentElement.clientHeight;
        this.levelOffsetX = document.querySelector('.static').getBoundingClientRect().left;
        this.levelX = 0;
        this.levelY = 0;
        this.levelGutter = 2;
        this.brickGutter = 2;
        this.brickWidth = Math.round(((this.levelWidth - this.levelGutter) / 10) - this.brickGutter);
        this.brickHeight = Math.round(this.levelHeight / 28 - this.brickGutter);
        this.brickColorScheme = [["transparent", "transparent", "transparent", "transparent"], ["#017374", "#2B898A", "#015859", "#000000"], ["#2E5873", "#3D7699", "#1F3B4D", "#000000"]];
        this.playerWidth = Math.round(this.levelWidth / 7);
        this.playerHeight = Math.round(this.levelHeight / 35);
        this.ballRadius = 10;
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
        this.dynamic = null;
        this.staticDrawRequest = true;
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
        if (this.dynamicDrawRequest) {
            renderBall(this._dynamic);
            renderPlayer(this._dynamic);
            this.dynamicDrawRequest = false;
        }
        if (this.staticDrawRequest) {
            renderBricks(this._static);
            this.staticDrawRequest = false;
        }
    }
}

class Level {
    constructor(level = 1) {
        this.x = settings.levelX;
        this.y = settings.levelY;
        this.bricks = [];
        this.strike = 0;
        this.levelField = document.querySelector('.info .level');
        this.level = level;
        this.scoreField = document.querySelector('.info .score');
        this.score = 0;
        this.totalField = document.querySelector('.info .total');
        this.total = 0;
    }

    set strike(v) {
        this._strike = v;
    }

    get strike() {
        return this._strike;
    }

    set score(v) {
        this._score = v;
    }

    get score() {
        return this._score;
    }

    set total(v) {
        this._total = v;
    }

    get total() {
        return this._total;
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

    updateInfo() {
        this.levelField.textContent = this.level;
        this.scoreField.textContent = this.score;
        this.score > this.total ? this.total = this.score : this.total;
        this.totalField.textContent = this.total;
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
        this.width = settings.brickWidth;
        this.height = settings.brickHeight;
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
        this._colorScheme = settings.brickColorScheme[this.strength];
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
        level.strike += 1;
        level.score += 10 * level.strike;
        this.strength -= 1;
        this.colorScheme = settings.brickColorScheme[this.strength];
        level.updateInfo();
        layers.staticDrawRequest = true;
        Sound.hit();
    }
}

class Player {
    constructor() {
        this.width = settings.playerWidth;
        this.height = settings.playerHeight;
        this.x = settings.levelX + settings.levelWidth / 2 - this.width / 2;
        this.y = settings.levelY + settings.levelHeight - settings.levelGutter * 4 - this.height;
    }

    set x(v) {
        this._x = v;
    }

    get x() {
        return this._x;
    }

    update() {
        this.movement();
    }

    movement() {
        if ((settings.isLevelLoaded && !settings.isLevelStarted) || (settings.isLevelStarted && !settings.isLevelPaused)) {
            this.x = settings.mouseX - settings.levelOffsetX - this.width / 2;
        }
        if (settings.isLevelStarted && !settings.isLevelPaused) {
            this.x = settings.mouseX - settings.levelOffsetX - this.width / 2;
        }
        if (settings.isLevelPaused) {
            this.x = this.x;
            layers.dynamicDrawRequest = false;
        }
        if (settings.mouseX !== this.x + settings.levelOffsetX + this.width / 2) {
            layers.dynamicDrawRequest = true;
        }
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
        this.radius = settings.ballRadius;
        this.x = player.x + player.width / 2;
        this.y = player.y - this.radius - 3;
        this.vx = 0;
        this.vy = 0;
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

    set isDead(v) {
        this._isDead = v;
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
        if (settings.isLevelLoaded && !settings.isLevelStarted) {
            this.x = player.x + player.width / 2;
            this.y = player.y - this.radius - 3;
            layers.dynamicDrawRequest = true;
        }
        if (settings.isLevelStarted && !settings.isLevelPaused) {
            this.x = this.x + this.vx;
            this.y = this.y + this.vy;
            layers.dynamicDrawRequest = true;
        }
        if (settings.isLevelPaused) {
            layers.dynamicDrawRequest = false;
        }
    }

    touchDown() {
        if (this.x + this.radius > player.x && this.x - this.radius < player.x + player.width) {
            if (this.y + this.radius > player.y && !this.isDead) {
                level.strike = 0;
                this.reflectFromPlayer();
                Sound.reflect();
            }
        }
    }

    reflectFromPlayer() {
        this.vx = this.vx - ((player.x + player.width / 2) - this.x) / 15;
        this.vy = -this.vy;
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
            this.stopMovement();
            Sound.lost();
        }
    }

    reflectVertical() {
        this.vy = -this.vy;
    }

    reflectHorizontal() {
        this.vx = -this.vx;
    }

    startMovement() {
        this.vx = Math.random() + 1;
        this.vy = -(Math.random() + 3);
    }

    stopMovement() {
        this.vx = 0;
        this.vy = 0;
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
    document.onclick = function () {
        settings.isLevelLoaded = true;
        document.querySelector('body').style.cursor = 'none';
        document.addEventListener('click', () => {
            if (settings.isLevelLoaded && !settings.isLevelStarted) {
                settings.isLevelStarted = true;
                ball.startMovement();
            }
        });
    }
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
            document.querySelector('body').style.cursor === 'none' ? document.querySelector('body').style.cursor = 'default' : document.querySelector('body').style.cursor = 'none';
            settings.isLevelPaused = !settings.isLevelPaused;
        }
    }
}

function init() {
    settings = new Settings();
    layers = new Layers();
    level = new Level();
    level.updateInfo();
    level.generateBricks();
    player = new Player();
    ball = new Ball();
    run();
}

init();