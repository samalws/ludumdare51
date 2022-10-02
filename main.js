"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var _a, _b;
var oneOverSqrt2 = 1 / Math.sqrt(2);
var imgWidthToRadius = .5 * Math.sqrt(2);
var epsilon = .0001;
var Direction;
(function (Direction) {
    Direction[Direction["Up"] = 0] = "Up";
    Direction[Direction["Down"] = 1] = "Down";
    Direction[Direction["Left"] = 2] = "Left";
    Direction[Direction["Right"] = 3] = "Right";
})(Direction || (Direction = {}));
var allDirections = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
function vec(x, y) { return { x: x, y: y }; }
var dirVecMap = (_a = {},
    _a[Direction.Left] = vec(-1, 0),
    _a[Direction.Right] = vec(1, 0),
    _a[Direction.Up] = vec(0, -1),
    _a[Direction.Down] = vec(0, 1),
    _a);
var canvasSize = 1200;
var originVec = vec(0, 0);
var centerVec = vec(600, 600);
var outerRadius = 500;
var innerRadius = 50;
var innerRadiusSq = innerRadius * innerRadius;
function addVecs(a, b) {
    return vec(a.x + b.x, a.y + b.y);
}
function subVecs(a, b) {
    return vec(a.x - b.x, a.y - b.y);
}
function mulVec(a, n) {
    return vec(a.x * n, a.y * n);
}
function unitVec(a) {
    var mag = vecMagnitude(a);
    return mulVec(a, mag == 0 ? 0 : (1 / mag));
}
function vecMagnitudeSq(a) {
    return a.x * a.x + a.y * a.y;
}
function vecMagnitude(a) {
    return Math.sqrt(vecMagnitudeSq(a));
}
function randomRadiusVec(rad) {
    var theta = Math.random() * 2 * Math.PI;
    return vec(rad * Math.cos(theta), rad * Math.sin(theta));
}
function hitboxesCollide(a, b) {
    var minDist = a.getRadius() + b.getRadius();
    var distSq = vecMagnitudeSq(subVecs(a.pos, b.pos));
    return distSq <= minDist * minDist;
}
var imgs = {};
function loadImg(name) {
    var img = new Image;
    img.src = name + ".png";
    imgs[name] = img;
}
loadImg("player");
loadImg("basicEnemy");
loadImg("waitingEnemy");
loadImg("wizEnemy");
loadImg("greyGooEnemy");
loadImg("scaredEnemy");
loadImg("swirlEnemy");
loadImg("tpEnemy");
loadImg("protoBasicEnemy");
loadImg("center");
var Delta = /** @class */ (function () {
    function Delta(delta) {
        this.delta = delta;
        this.cosRot = Math.cos(delta * Delta.rotMul);
        this.sinRot = Math.sin(delta * Delta.rotMul);
    }
    Delta.prototype.rotateVec = function (v) {
        return vec(v.x * this.cosRot - v.y * this.sinRot, v.x * this.sinRot + v.y * this.cosRot);
    };
    Delta.rotMul = 1 * (Math.PI / 180) / 1000;
    return Delta;
}());
function genBackgroundStars() {
    var stars = [];
    var genRad = imgWidthToRadius * canvasSize;
    var genDiam = genRad * 2;
    for (var i = 0; i < 1000; i++) // 500 * sqrt(2) * sqrt(2)
        stars.push(vec(Math.random() * genDiam - genRad, Math.random() * genDiam - genRad));
    return stars;
}
function rotBackgroundStars(stars, delta) {
    return stars.map(function (s) { return delta.rotateVec(s); });
}
var Background = /** @class */ (function () {
    function Background() {
    }
    Background.prototype.render = function (ctx, xSize, ySize) {
        ctx.fillStyle = "#2A324B";
        ctx.fillRect(0, 0, xSize, ySize);
        ctx.fillStyle = "#FFFFFF";
        Background.stars.forEach(function (s) { return ctx.fillRect(s.x + centerVec.x, s.y + centerVec.y, 2, 2); });
    };
    Background.prototype.update = function (delta) {
        Background.stars = rotBackgroundStars(Background.stars, delta);
    };
    Background.stars = genBackgroundStars();
    return Background;
}());
var TextObj = /** @class */ (function () {
    function TextObj(text, height) {
        this.text = text;
        this.height = height;
    }
    TextObj.prototype.render = function (ctx, xSize, ySize) {
        ctx.font = "48px sans-serif";
        ctx.fillStyle = "#E58F65";
        ctx.fillText(this.text, 10, this.height);
    };
    TextObj.prototype.update = function (delta) { };
    return TextObj;
}());
var ScoreObj = /** @class */ (function (_super) {
    __extends(ScoreObj, _super);
    function ScoreObj() {
        return _super.call(this, "0", 50) || this;
    }
    ScoreObj.prototype.update = function (delta) {
        this.text = "" + score;
    };
    return ScoreObj;
}(TextObj));
var Particle = /** @class */ (function () {
    function Particle(pos, vel) {
        this.pos = pos;
        this.vel = vel;
        this.angle = Math.random() * 2 * Math.PI;
        this.angVel = Math.random() * 2 * Particle.angVelMax - Particle.angVelMax;
        this.lifetime = Math.random() * Particle.lifetimeMax;
        this.color = Particle.colors[Math.floor(Math.random() * Particle.colors.length)];
    }
    Particle.prototype.render = function (ctx, xSize, ySize) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(-10, -10, 20, 20);
        ctx.restore();
    };
    Particle.prototype.update = function (delta) {
        this.pos = addVecs(this.pos, mulVec(this.vel, delta.delta));
        this.angle += this.angVel * delta.delta;
        this.lifetime -= delta.delta;
        if (this.lifetime < 0)
            removeFromList(this, objectList);
    };
    Particle.angVelMax = 2 / 1000;
    Particle.lifetimeMax = .1 * 1000;
    Particle.colors = ["#ff000055", "#ff880055"]; // TODO
    return Particle;
}());
var GameObject = /** @class */ (function () {
    function GameObject(pos, vel, imgName, framerateHz) {
        if (framerateHz === void 0) { framerateHz = 30; }
        this.timeToParticle = GameObject.particleTimeFull;
        this.imgAngle = 0;
        this.pos = pos;
        this.vel = vel;
        this.setVel(vel);
        this.img = imgs[imgName];
    }
    GameObject.prototype.render = function (ctx, xSize, ySize) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.imgAngle);
        ctx.drawImage(this.img, -this.img.width * .5, -this.img.height * .5);
        ctx.restore();
    };
    GameObject.prototype.update = function (delta) {
        this.pos = addVecs(this.pos, mulVec(this.vel, delta.delta));
        this.pos = addVecs(centerVec, delta.rotateVec(subVecs(this.pos, centerVec)));
        this.timeToParticle -= delta.delta;
        if (this.timeToParticle <= 0) {
            var velMagSq = vecMagnitudeSq(this.vel);
            if (velMagSq > epsilon) {
                var negVelUnit = mulVec(this.vel, -1 / Math.sqrt(velMagSq));
                var particlePos = addVecs(this.pos, mulVec(negVelUnit, this.getRadius()));
                var particleVel = mulVec(negVelUnit, 300 / 1000);
                objectList.splice(1, 0, new Particle(particlePos, particleVel));
            }
            this.timeToParticle = GameObject.particleTimeFull;
        }
    };
    GameObject.prototype.setVel = function (newVel) {
        this.vel = newVel;
        if (vecMagnitudeSq(newVel) > epsilon)
            this.imgAngle = Math.atan2(newVel.x, -newVel.y);
        // TODO when youre moving diagonally and then release both the sprite becomes horizontal
    };
    GameObject.prototype.getRadius = function () {
        return this.img.width * imgWidthToRadius;
    };
    GameObject.particleTimeFull = .05 * 1000;
    return GameObject;
}());
var Center = /** @class */ (function (_super) {
    __extends(Center, _super);
    function Center() {
        return _super.call(this, centerVec, originVec, "center") || this;
    }
    Center.prototype.update = function (delta) {
        var _this = this;
        _super.prototype.update.call(this, delta);
        enemyList.forEach(function (e) { if (hitboxesCollide(_this, e))
            gameOver(); });
    };
    return Center;
}(GameObject));
var Player = /** @class */ (function (_super) {
    __extends(Player, _super);
    function Player() {
        return _super.call(this, addVecs(centerVec, vec(0, innerRadius + 50)), originVec, "player") || this;
    }
    Player.prototype.update = function (delta) {
        var _this = this;
        _super.prototype.update.call(this, delta);
        enemyList.forEach(function (e) { if (hitboxesCollide(_this, e))
            removeEnemy(e); });
        var relPos = subVecs(this.pos, centerVec);
        var distFromCenterSq = vecMagnitudeSq(relPos);
        if (distFromCenterSq < innerRadiusSq)
            this.pos = addVecs(centerVec, mulVec(relPos, innerRadius / Math.sqrt(distFromCenterSq)));
    };
    Player.prototype.keysChanged = function (velNew) {
        var mag = vecMagnitudeSq(velNew);
        if (mag == 2)
            velNew = mulVec(velNew, oneOverSqrt2);
        this.setVel(mulVec(velNew, 100 / 1000));
        if (mag == 0)
            engineAudio.pause();
        else
            engineAudio.play();
    };
    return Player;
}(GameObject));
function velTowardsCenter(pos, speed) {
    return mulVec(unitVec(subVecs(centerVec, pos)), speed);
}
function velPerpCenter(pos, speed) {
    var towards = velTowardsCenter(pos, speed);
    return vec(-towards.y, towards.x);
}
function velCenterBlend(pos, towardsSpeed, perpSpeed) {
    var towards = velTowardsCenter(pos, 1);
    return vec(towards.x * towardsSpeed - towards.y * perpSpeed, towards.y * towardsSpeed + towards.x * perpSpeed);
}
var Enemy = /** @class */ (function (_super) {
    __extends(Enemy, _super);
    function Enemy(pos, vel, imgName, framerateHz) {
        if (framerateHz === void 0) { framerateHz = 30; }
        var _this = _super.call(this, pos, vel, imgName, framerateHz) || this;
        _this.givesPoints = true;
        return _this;
    }
    return Enemy;
}(GameObject));
var BasicEnemy = /** @class */ (function (_super) {
    __extends(BasicEnemy, _super);
    function BasicEnemy(pos) {
        var _this = _super.call(this, pos, originVec, "basicEnemy") || this;
        _this.timeToUpdate = 0;
        return _this;
    }
    BasicEnemy.prototype.update = function (delta) {
        _super.prototype.update.call(this, delta);
        this.timeToUpdate -= delta.delta;
        if (this.timeToUpdate <= 0) {
            this.setVel(velTowardsCenter(this.pos, 50 / 1000));
            this.timeToUpdate = BasicEnemy.updateTimeFull;
        }
    };
    BasicEnemy.updateTimeFull = 1000 / 10;
    return BasicEnemy;
}(Enemy));
var basicEnemy = function (pos) { return new BasicEnemy(pos); };
var WaitingEnemy = /** @class */ (function (_super) {
    __extends(WaitingEnemy, _super);
    function WaitingEnemy(pos) {
        var _this = _super.call(this, pos, originVec, "waitingEnemy") || this;
        _this.timeLeft = 1000 * 20 * Math.random();
        return _this;
    }
    WaitingEnemy.prototype.update = function (delta) {
        _super.prototype.update.call(this, delta);
        if (this.timeLeft <= 0)
            return;
        this.timeLeft -= delta.delta;
        if (this.timeLeft > 0)
            return;
        this.setVel(velTowardsCenter(this.pos, 70 / 1000));
    };
    return WaitingEnemy;
}(Enemy));
var waitingEnemy = function (pos) { return new WaitingEnemy(pos); };
var WizEnemy = /** @class */ (function (_super) {
    __extends(WizEnemy, _super);
    function WizEnemy(pos) {
        var _this = _super.call(this, pos, originVec, "wizEnemy") || this;
        _this.timeToNewSpawn = WizEnemy.spawnTimeFull;
        return _this;
    }
    WizEnemy.prototype.update = function (delta) {
        _super.prototype.update.call(this, delta);
        this.timeToNewSpawn -= delta.delta;
        if (this.timeToNewSpawn <= 0) {
            objectList.splice(1, 0, new ProtoBasicEnemy(this.pos, addVecs(centerVec, randomRadiusVec(outerRadius))));
            this.timeToNewSpawn = WizEnemy.spawnTimeFull;
            playSfx("wiz");
        }
    };
    WizEnemy.spawnTimeFull = 1000 * 10;
    return WizEnemy;
}(Enemy));
var wizEnemy = function (pos) { return new WizEnemy(pos); };
var GreyGooEnemy = /** @class */ (function (_super) {
    __extends(GreyGooEnemy, _super);
    function GreyGooEnemy(pos, spawnsLeft) {
        var _this = _super.call(this, pos, originVec, "greyGooEnemy") || this;
        _this.timeToUpdate = 0;
        _this.timeToNewSpawn = GreyGooEnemy.spawnTimeFull;
        _this.spawnsLeft = spawnsLeft;
        _this.givesPoints = spawnsLeft == GreyGooEnemy.defltSpawnsLeft;
        return _this;
    }
    GreyGooEnemy.prototype.update = function (delta) {
        _super.prototype.update.call(this, delta);
        this.timeToUpdate -= delta.delta;
        if (this.timeToUpdate <= 0) {
            this.setVel(velTowardsCenter(this.pos, 10 / 1000));
            this.timeToUpdate = GreyGooEnemy.updateTimeFull;
        }
        if (this.spawnsLeft == 0)
            return;
        this.timeToNewSpawn -= delta.delta;
        if (this.timeToNewSpawn <= 0) {
            spawnEnemy(greyGooEnemy(this.spawnsLeft - 1), addVecs(this.pos, randomRadiusVec(50)));
            this.timeToNewSpawn = GreyGooEnemy.spawnTimeFull;
            playSfx("greyGoo");
        }
    };
    GreyGooEnemy.updateTimeFull = 1000 / 10;
    GreyGooEnemy.spawnTimeFull = 1000 * 5;
    GreyGooEnemy.defltSpawnsLeft = 10;
    return GreyGooEnemy;
}(Enemy));
var greyGooEnemy = function (spawnsLeft) { return function (pos) { return new GreyGooEnemy(pos, spawnsLeft); }; };
var greyGooEnemyDeflt = greyGooEnemy(GreyGooEnemy.defltSpawnsLeft);
var ScaredEnemy = /** @class */ (function (_super) {
    __extends(ScaredEnemy, _super);
    function ScaredEnemy(pos) {
        return _super.call(this, pos, originVec, "scaredEnemy") || this;
    }
    ScaredEnemy.prototype.update = function (delta) {
        _super.prototype.update.call(this, delta);
        if (vecMagnitudeSq(subVecs(player.pos, this.pos)) < 100 * 100)
            this.setVel(velTowardsCenter(this.pos, -60 / 1000));
        else
            this.setVel(velTowardsCenter(this.pos, 50 / 1000));
    };
    return ScaredEnemy;
}(Enemy));
var scaredEnemy = function (pos) { return new ScaredEnemy(pos); };
var SwirlEnemy = /** @class */ (function (_super) {
    __extends(SwirlEnemy, _super);
    function SwirlEnemy(pos) {
        var _this = _super.call(this, pos, originVec, "swirlEnemy") || this;
        _this.timeToUpdate = 0;
        return _this;
    }
    SwirlEnemy.prototype.update = function (delta) {
        _super.prototype.update.call(this, delta);
        this.timeToUpdate -= delta.delta;
        if (this.timeToUpdate <= 0) {
            this.setVel(velCenterBlend(this.pos, 50 / 1000, 100 / 1000));
            this.timeToUpdate = SwirlEnemy.updateTimeFull;
        }
    };
    SwirlEnemy.updateTimeFull = 1000 / 10;
    return SwirlEnemy;
}(Enemy));
var swirlEnemy = function (pos) { return new SwirlEnemy(pos); };
var TpEnemy = /** @class */ (function (_super) {
    __extends(TpEnemy, _super);
    function TpEnemy(pos) {
        var _this = _super.call(this, pos, velTowardsCenter(pos, 50 / 1000), "tpEnemy") || this;
        _this.timeToTp = TpEnemy.tpTimeFull;
        return _this;
    }
    TpEnemy.prototype.update = function (delta) {
        _super.prototype.update.call(this, delta);
        this.timeToTp -= delta.delta;
        if (this.timeToTp <= 0) {
            this.pos = addVecs(this.pos, velCenterBlend(this.pos, 50, 100));
            this.setVel(velTowardsCenter(this.pos, 50 / 1000));
            this.timeToTp = TpEnemy.tpTimeFull;
        }
    };
    TpEnemy.tpTimeFull = 1000 * 3;
    return TpEnemy;
}(Enemy));
var tpEnemy = function (pos) { return new TpEnemy(pos); };
var ProtoBasicEnemy = /** @class */ (function (_super) {
    __extends(ProtoBasicEnemy, _super);
    function ProtoBasicEnemy(pos, targetPos) {
        var _this = _super.call(this, pos, originVec, "protoBasicEnemy") || this;
        _this.timeToUpdate = 0;
        _this.targetPos = targetPos;
        _this.givesPoints = false;
        return _this;
    }
    ProtoBasicEnemy.prototype.update = function (delta) {
        _super.prototype.update.call(this, delta);
        this.timeToUpdate -= delta.delta;
        if (this.timeToUpdate <= 0) {
            this.setVel(mulVec(unitVec(subVecs(this.targetPos, this.pos)), 1000 / 1000));
            this.timeToUpdate = ProtoBasicEnemy.updateTimeFull;
        }
        if (vecMagnitudeSq(subVecs(this.pos, this.targetPos)) < 50 * 50) {
            spawnEnemy(basicEnemy, this.targetPos);
            removeEnemy(this);
        }
    };
    ProtoBasicEnemy.updateTimeFull = 1000 / 10;
    return ProtoBasicEnemy;
}(Enemy));
function removeFromList(x, l) {
    var index = l.findIndex(function (e) { return e === x; });
    if (index !== undefined && index !== -1)
        l.splice(index, 1);
}
function removeEnemy(enemy) {
    removeFromList(enemy, enemyList);
    removeFromList(enemy, objectList);
    if (enemy.givesPoints)
        score += 1;
    // explode
    for (var i = 0; i < 50; i++) {
        var radVec = randomRadiusVec(1);
        objectList.splice(1, 0, new Particle(addVecs(enemy.pos, mulVec(radVec, 20)), mulVec(radVec, 300 / 1000)));
    }
    playSfx("explosion");
}
// GAME STATE
var player;
var enemyList;
var objectList;
var score;
var timeToEnemySpawn;
var timer;
var gameIsOver = true;
var gameIsTut = false;
function spawnEnemy(ctor, pos) {
    pos = pos !== null && pos !== void 0 ? pos : addVecs(centerVec, randomRadiusVec(outerRadius));
    var enemy = ctor(pos);
    enemyList.push(enemy);
    objectList.push(enemy);
    playSfx("enemySpawn");
}
function update(delta) {
    objectList.forEach(function (r) { return r.update(delta); });
    timeToEnemySpawn -= delta.delta;
    if (timeToEnemySpawn <= 0) {
        timeToEnemySpawn = 1000 * 10;
        if (score == 0) {
            spawnEnemy(basicEnemy);
        }
        else {
            var numSpawns = (score < 4) ? 1 : (score < 16) ? 2 : (score < 64) ? 3 : 4;
            for (var i = 0; i < numSpawns; i++) {
                var rng = Math.random();
                if (rng < 1 / 7)
                    spawnEnemy(wizEnemy);
                else if (rng < 2 / 7)
                    spawnEnemy(waitingEnemy);
                else if (rng < 3 / 6)
                    spawnEnemy(greyGooEnemyDeflt);
                else if (rng < 4 / 7)
                    spawnEnemy(scaredEnemy);
                else if (rng < 5 / 7)
                    spawnEnemy(swirlEnemy);
                else if (rng < 6 / 7)
                    spawnEnemy(tpEnemy);
                else {
                    spawnEnemy(basicEnemy);
                    spawnEnemy(basicEnemy);
                }
            }
        }
    }
}
function gameOver() {
    if (gameIsOver)
        return;
    clearInterval(timer);
    gameIsOver = true;
    objectList.push(new TextObj("Game over! Press R to play again.", 100));
    playSfx("gameover");
}
function initGame() {
    player = new Player();
    enemyList = [];
    objectList = [new Background, new ScoreObj, new Center, player];
    score = 0;
    timeToEnemySpawn = 0;
    var lastUpdate = Date.now();
    timer = window.setInterval(function () {
        var newNow = Date.now();
        var delta = new Delta(newNow - lastUpdate);
        lastUpdate = newNow;
        update(delta);
    }, 1000 / 60);
    gameIsOver = false;
    gameIsTut = false;
    playSfx("gameBegin");
}
function initTut() {
    player = new Player();
    enemyList = [];
    objectList = [
        new Background,
        new Center,
        player,
        new TextObj("Use arrow keys to move.", 50),
        new TextObj("Don't let any enemies get to the center.", 100),
        new TextObj("Touch an enemy to kill it.", 150),
        new TextObj("Press space to begin.", 200)
    ];
    score = 0;
    timeToEnemySpawn = 0;
    gameIsOver = false;
    gameIsTut = true;
}
function resetGame() {
    gameOver();
    initGame();
}
var enumDirMap = {
    "ArrowLeft": Direction.Left,
    "ArrowRight": Direction.Right,
    "ArrowUp": Direction.Up,
    "ArrowDown": Direction.Down
};
var keysDown = (_b = {},
    _b[Direction.Left] = false,
    _b[Direction.Right] = false,
    _b[Direction.Up] = false,
    _b[Direction.Down] = false,
    _b);
var alertKey = function (upOrDown) { return function (event) {
    if (event.code == "KeyR" && !upOrDown && !gameIsTut) {
        resetGame();
    }
    else if (event.code == "Space" && !upOrDown && gameIsTut) {
        resetGame();
        songAudio.play(); // TODO what if not loaded yet?
    }
    else {
        var dir = enumDirMap[event.code];
        if (dir === undefined)
            return;
        keysDown[dir] = upOrDown;
        var addedDir_1 = originVec;
        allDirections.forEach(function (dir) { addedDir_1 = addVecs(addedDir_1, keysDown[dir] ? dirVecMap[dir] : originVec); });
        player.keysChanged(addedDir_1);
    }
}; };
document.addEventListener("keydown", alertKey(true), false);
document.addEventListener("keyup", alertKey(false), false);
initTut();
function checkContext(x) {
    if (x === null)
        throw "null rendering context";
    return x;
}
var canvas = document.getElementById("canvas");
var context = checkContext(canvas.getContext("2d"));
function renderScreen() {
    window.requestAnimationFrame(renderScreen);
    objectList.forEach(function (r) { return r.render(context, canvas.width, canvas.height); });
}
renderScreen();
var songAudio = new Audio("song.wav");
songAudio.loop = true;
var engineAudio = new Audio("engineOn.wav");
engineAudio.loop = true;
var sfxAudio = {};
function addSfx(name, n) {
    if (n === void 0) { n = 3; }
    var audioList = [];
    for (var i = 0; i < n; i++)
        audioList.push(new Audio(name + ".wav"));
    sfxAudio[name] = audioList;
}
addSfx("enemySpawn");
addSfx("explosion");
addSfx("gameBegin");
addSfx("gameBegin2"); // TODO
addSfx("gameover");
addSfx("greyGoo");
addSfx("wiz");
function playSfx(name) {
    var audioList = sfxAudio[name];
    for (var _i = 0, audioList_1 = audioList; _i < audioList_1.length; _i++) {
        var audio = audioList_1[_i];
        if (audio.paused) {
            audio.play();
            break;
        }
    }
}
