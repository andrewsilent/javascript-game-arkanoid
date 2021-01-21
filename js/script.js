class Settings {
    constructor(maxWidth = document.documentElement.clientWidth, maxHeight = document.documentElement.clientHeight) {
        this.wrapper = document.querySelector('.canvas-wrapper');
        this.levelGutter = 2;
        this.levelWidth = Math.round(maxWidth > 800 ? 800 : maxWidth);
        this.levelHeight = Math.round(maxHeight > 800 ? 800 : maxHeight);
        this.levelPosition = 'absolute';
        this.levelX = 0;
        this.levelY = 0;
        this.brickRowMax = 10;
        this.brickColMax = 30;
        this.brickGutter = 2;
        this.brickWidth = Math.round(this.levelWidth / 10 - (this.brickGutter + this.levelGutter / 10));
        this.brickHeight = Math.round(this.levelHeight / 30 - this.brickGutter);
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
        settings.wrapper.appendChild(document.createElement('canvas')).classList.add('static');
        this._static = document.getElementsByClassName('static').item(0);
        this._static.width = settings.levelWidth;
        this._static.height = settings.levelHeight;
        this._static.style.top = settings.levelX;
        this._static.style.left = settings.levelY;
    }

    get static() {
        return this._static;
    }

    set regular(v) {
        settings.wrapper.appendChild(document.createElement('canvas')).classList.add('regular');
        this._regular = document.getElementsByClassName('regular').item(0);
        this._regular.width = settings.levelWidth;
        this._regular.height = settings.levelHeight;
        this._regular.style.position = settings.levelPosition;
        this._regular.style.top = settings.levelX;
        this._regular.style.left = settings.levelY;
    }

    get regular() {
        return this._regular;
    }

    set dynamic(v) {
        settings.wrapper.appendChild(document.createElement('canvas')).classList.add('dynamic');
        this._dynamic = document.getElementsByClassName('dynamic').item(0);
        this._dynamic.width = settings.levelWidth;
        this._dynamic.height = settings.levelHeight;
        this._dynamic.style.position = settings.levelPosition;
        this._dynamic.style.top = settings.levelX;
        this._dynamic.style.left = settings.levelY;
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
        if (this.staticDrawRequest) {
            this.clear(this._static);
            renderLevel(this._static);
            this.staticDrawRequest = false;
        }
        if (this.regularDrawRequest) {
            this.clear(this._regular);
            renderBricks(this._regular);
            this.regularDrawRequest = false;
        }
        if (this.dynamicDrawRequest) {
            this.clear(this._dynamic);
            renderPlayer(this._dynamic);
            renderBall(this._dynamic);
            this.dynamicDrawRequest = false;
        }
    }

    clear(canvas) {
        let ctx = canvas.getContext('2d');
        ctx.clearRect(settings.levelX, settings.levelY, settings.levelWidth, settings.levelHeight);
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

    }

    createRandomBricks() { // smell - использовать Фабрику, перенести генерацию, переписать способ генерации на функции с рекурсией
        let emptyRows = 0;
        let rowsCount = 0;
        let bricksCount = 0;
        let minRowsCount = 1;
        let minBricksCount = 30;
        for (let i = 0; i < minRowsCount; i++) {
            if (!this.randomRowExistance(emptyRows)) {
                this.bricks.push([]);
                emptyRows += 1;
                minRowsCount += 1;
                continue;
            }
            if (bricksCount > minBricksCount) {
                break;
            }
            rowsCount += 1;
            this.bricks[i] = [];
            let symmetryMode = false;
            let symmetry = [];
            for (let j = 0; j < settings.brickRowMax; j++) {
                if (!symmetryMode) {
                    this.bricks[i].push(new BrickType(j, i, this.randomBrickType(j)));
                    symmetry.push(this.bricks[i][j].type);
                }
                if (symmetryMode) {
                    this.bricks[i].push(new BrickType(j, i, symmetry.pop()));
                }
                if (this.bricks[i][j].type) {
                    bricksCount += 1;
                }
                if (j + 1 === settings.brickRowMax / 2) {
                    symmetryMode = true;
                }
                if ((i == minRowsCount - 1 && bricksCount < minBricksCount)) {
                    minRowsCount += 1;
                }
                this.bricks[i][j].brickStatus();
            }
        }
    }

    randomRowExistance(emptyRows) {
        return Math.random() < 0.3 + this.levelDifficulty * 0.3 + emptyRows * 0.1;
    }

    randomBrickType(j) {
        if (j > 2) {
            return Math.ceil(Math.random() * (this.levelDifficulty));
        }
        return Math.ceil(Math.random() * (this.levelDifficulty + 2) - 1);
    }
}

class Brick {
    constructor(x = 0, y = 0) { // smell - мутация входных параметров, x y - это порядковый номер в массиве кирпичей, его и нужно сохранить, а реальные координаты потом высчитывать по формуле
        this.width = settings.brickWidth /* * 1.215 + settings.brickGutter*/;
        this.height = settings.brickHeight;
        this.x = settings.levelX + settings.levelGutter + settings.brickGutter * x + x * this.width;
        this.y = settings.levelY + settings.levelGutter + settings.brickGutter * y + y * this.height;
    }
}

class BrickType extends Brick { // smell - лучше использовать паттерн Фабрика, и переписать генерацию кирпичей в фабрику / плюс сейчас происходит мутация входных данных x,y - это i,j
    constructor(x, y, type) {
        super(x, y);
        this.type = type;
        this.strength = undefined;
        this.hasBonus = false;
        this.baseColor = "transparent";
        this.topColor = "transparent";
        this.bottomColor = "transparent";
        this.strokeColor = "transparent";
    }

    update() {
        if (this.type !== 0) {  // smell - зона ответственности Ball попала в другое место
            if (this.leftImpact() || this.rightImpact()) {
                ball.reflectHorizontal();
                this.hit();

            }
            if (this.topImpact() || this.bottomImpact()) {
                ball.reflectVertical();
                this.hit();
            }
        }
        this.brickStatus();
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
        return ball.x < this.x + this.width && ball.x > this.x;
    }
    isInVerticalRange() { // по вертикали мяч находится в пределах кирпича
        return ball.y < this.y + this.height && ball.y > this.y;
    }

    hit() {
        this.strength -= 1;
        layers.regularDrawRequest = true;
        Sound.hit();
    }

    brickStatus() {
        if (this.type <= 0 || this.strength <= 0) {
            this.baseColor = "transparent";
            this.topColor = "transparent";
            this.bottomColor = "transparent";
            this.strokeColor = "transparent";
            this.strength = 0;
            this.type = 0;
        }
        if (this.type === 1 || this.strength === 1) {
            this.baseColor = "#017374";
            this.topColor = "#2B898A";
            this.bottomColor = "#015859";
            this.strokeColor = "#000000";
            this.strength = 1;
            this.type = 1;
        }
        if (this.type === 2 || this.strength === 2) {
            this.baseColor = "#2E5873";
            this.topColor = "#3D7699";
            this.bottomColor = "#1F3B4D";
            this.strokeColor = "#000000";
            this.strength = 2;
            this.type = 2;
        }
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

function createLevel(levelDifficulty) {
    settings = new Settings();
    layers = new Layers();
    level = new Level(levelDifficulty);
    level.createRandomBricks();
    player = new Player();
    ball = new Ball();
}

function run() {
    // render();
    update();
    animate();
}

function update() {
    mouseAction();
    layers.update();
    level.update();
    for (let i = 0; i < level.bricks.length; i++) {
        for (j = 0; j < level.bricks[i].length; j++) {
            level.bricks[i][j].update();
        }
    }
    player.update();
    ball.update();
}

function animate() {
    requestAnimationFrame(run);
}

function renderLevel(canvas) {
    ctx = canvas.getContext('2d');
    ctx.strokeStyle = level.strokeColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(settings.levelX, settings.levelY, settings.levelWidth, settings.levelHeight);
    ctx.fillStyle = level.fillColor;
    ctx.fillRect(settings.levelX, settings.levelY, settings.levelWidth, settings.levelHeight);
}

function renderBricks(canvas) {
    ctx = canvas.getContext('2d');
    for (let i = 0; i < level.bricks.length; i++) {
        for (j = 0; j < level.bricks[i].length; j++) {
            // base
            ctx.shadowColor = '#666666';
            ctx.shadowOffsetY = 2;
            ctx.shadowBlur = 5;
            ctx.fillStyle = level.bricks[i][j].baseColor;
            ctx.fillRect(level.bricks[i][j].x, level.bricks[i][j].y, level.bricks[i][j].width, level.bricks[i][j].height);
            ctx.strokeStyle = level.bricks[i][j].strokeColor;
            // top side
            ctx.shadowColor = 'transparent';
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(level.bricks[i][j].x, level.bricks[i][j].y);
            ctx.lineTo(level.bricks[i][j].x + 20, level.bricks[i][j].y + settings.brickHeight / 2);
            ctx.lineTo(level.bricks[i][j].x + settings.brickWidth - 20, level.bricks[i][j].y + settings.brickHeight / 2);
            ctx.lineTo(level.bricks[i][j].x + settings.brickWidth, level.bricks[i][j].y);
            ctx.closePath();
            ctx.lineWidth = 0.1;
            ctx.fillStyle = level.bricks[i][j].topColor;
            ctx.stroke();
            ctx.fill();
            // bottom side
            ctx.beginPath();
            ctx.moveTo(level.bricks[i][j].x, level.bricks[i][j].y + settings.brickHeight);
            ctx.lineTo(level.bricks[i][j].x + 20, level.bricks[i][j].y + settings.brickHeight / 2);
            ctx.lineTo(level.bricks[i][j].x + settings.brickWidth - 20, level.bricks[i][j].y + settings.brickHeight / 2);
            ctx.lineTo(level.bricks[i][j].x + settings.brickWidth, level.bricks[i][j].y + settings.brickHeight);
            ctx.closePath();
            ctx.lineWidth = 0.1;
            ctx.fillStyle = level.bricks[i][j].bottomColor;
            ctx.stroke();
            ctx.fill();
        }
    }
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

function mouseAction() {
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

createLevel();
run();