interface Renderable {
  render: (ctx: CanvasRenderingContext2D, xSize: number, ySize: number) => void
}

interface Updatable {
  update: (delta: number) => void
}

interface HasHitbox {
  readonly pos: Vec
  getRadius: () => number
}

enum Direction {
  Up,
  Down,
  Left,
  Right,
}

const allDirections = [ Direction.Up, Direction.Down, Direction.Left, Direction.Right ]

type Vec = { readonly x: number, readonly y: number }

function vec(x: number, y: number): Vec { return { x, y } }

const dirVecMap = {
  [Direction.Left]: vec(-1, 0),
  [Direction.Right]: vec(1, 0),
  [Direction.Up]: vec(0, -1),
  [Direction.Down]: vec(0, 1),
}

const originVec: Vec = vec(0, 0)
const centerVec: Vec = vec(600, 600)
const outerRadius = 500
const innerRadius = 50
const innerRadiusSq = innerRadius*innerRadius

function addVecs(a: Vec, b: Vec): Vec {
  return vec(a.x + b.x, a.y + b.y)
}

function subVecs(a: Vec, b: Vec): Vec {
  return vec(a.x - b.x, a.y - b.y)
}

function mulVec(a: Vec, n: number): Vec {
  return vec(a.x * n, a.y * n)
}

function unitVec(a: Vec): Vec {
  const mag = vecMagnitude(a)
  return mulVec(a, mag == 0 ? 0 : (1/mag))
}

function vecMagnitudeSq(a: Vec): number {
  return a.x*a.x + a.y*a.y
}

function vecMagnitude(a: Vec): number {
  return Math.sqrt(vecMagnitudeSq(a))
}

function randomRadiusVec(rad: number): Vec {
  const theta = Math.random() * 2 * Math.PI
  return vec(rad * Math.cos(theta), rad * Math.sin(theta))
}

function hitboxesCollide(a: HasHitbox, b: HasHitbox): boolean {
  const minDist = a.getRadius() + b.getRadius()
  const distSq = vecMagnitudeSq(subVecs(a.pos, b.pos))
  return distSq <= minDist*minDist
}

const imgs: { [name: string]: HTMLImageElement } = {}

function loadImg(name: string) {
  const img = new Image
  img.src = name + ".png"
  imgs[name] = img
}

loadImg("player")
loadImg("enemy")
loadImg("waitingEnemy")
loadImg("wizEnemy")
loadImg("greyGooEnemy")
loadImg("scaredEnemy")
loadImg("swirlEnemy")
loadImg("tpEnemy")
loadImg("center")

class Background implements Renderable, Updatable {
  constructor() {}
  render(ctx: CanvasRenderingContext2D, xSize: number, ySize: number) {
    ctx.fillStyle = "#2A324B"
    ctx.fillRect(0, 0, xSize, ySize)
  }
  update(delta: number) {}
}

class TextObj implements Renderable, Updatable {
  text: string
  readonly height: number
  constructor(text: string, height: number) {
    this.text = text
    this.height = height
  }
  render(ctx: CanvasRenderingContext2D, xSize: number, ySize: number) {
    ctx.font = "48px sans-serif"
    ctx.fillStyle = "#E58F65"
    ctx.fillText(this.text, 10, this.height)
  }
  update(delta: number) {}
}

class ScoreObj extends TextObj {
  constructor() { super("0", 50) }
  update(delta: number) {
    this.text = "" + score
  }
}

const imgWidthToRadius = .5*Math.sqrt(2)

class GameObject implements Renderable, Updatable, HasHitbox {
  pos: Vec
  vel: Vec
  readonly img: HTMLImageElement
  constructor(pos: Vec, vel: Vec, imgName: string, framerateHz: number = 30) {
    this.pos = pos
    this.vel = vel
    this.setVel(vel)
    this.img = imgs[imgName]
  }
  imgAngle = 0
  render(ctx: CanvasRenderingContext2D, xSize: number, ySize: number) {
    ctx.save()
    ctx.translate(this.pos.x, this.pos.y)
    ctx.rotate(this.imgAngle)
    ctx.drawImage(this.img, -this.img.width*.5, -this.img.height*.5)
    ctx.restore()
  }
  update(delta: number) {
    this.pos = addVecs(this.pos, mulVec(this.vel, delta))
  }
  setVel(newVel: Vec) {
    this.vel = newVel
    if (vecMagnitudeSq(newVel) > .0001)
      this.imgAngle = Math.atan2(newVel.x, -newVel.y)
    // TODO when youre moving diagonally and then release both the sprite becomes horizontal
  }
  getRadius() {
    return this.img.width*imgWidthToRadius
  }
}

class Center extends GameObject {
  constructor() {
    super(centerVec, originVec, "center")
  }
  update(delta: number) {
    super.update(delta)
    enemyList.forEach((e) => { if (hitboxesCollide(this, e)) gameOver() })
  }
}

const oneOverSqrt2 = 1/Math.sqrt(2)

class Player extends GameObject {
  constructor() {
    super(addVecs(centerVec, vec(0, innerRadius)), originVec, "player")
  }
  update(delta: number) {
    super.update(delta)
    enemyList.forEach((e) => { if (hitboxesCollide(this, e)) removeEnemy(e) })

    const relPos = subVecs(this.pos, centerVec)
    const distFromCenterSq = vecMagnitudeSq(relPos)
    if (distFromCenterSq < innerRadiusSq)
      this.pos = addVecs(centerVec, mulVec(relPos, innerRadius/Math.sqrt(distFromCenterSq)))
  }
  keysChanged(velNew: Vec) {
    if (vecMagnitudeSq(velNew) == 2)
      velNew = mulVec(velNew, oneOverSqrt2)
    this.setVel(mulVec(velNew, 100/1000))
  }
}

function velTowardsCenter(pos: Vec, speed: number): Vec {
  return mulVec(unitVec(subVecs(centerVec, pos)), speed)
}

function velPerpCenter(pos: Vec, speed: number): Vec {
  const towards = velTowardsCenter(pos, speed)
  return vec(-towards.y, towards.x)
}

function velCenterBlend(pos: Vec, towardsSpeed: number, perpSpeed: number) {
  const towards = velTowardsCenter(pos, 1)
  return vec(towards.x * towardsSpeed - towards.y * perpSpeed, towards.y * towardsSpeed + towards.x * perpSpeed)
}

class Enemy extends GameObject {
  givesPoints = true
  constructor(pos: Vec, vel: Vec, imgName: string, framerateHz: number = 30) {
    super(pos, vel, imgName, framerateHz)
  }
}

class BasicEnemy extends Enemy {
  constructor(pos: Vec) {
    super(pos, velTowardsCenter(pos, 50/1000), "enemy")
  }
}

const basicEnemy = (pos: Vec) => new BasicEnemy(pos)

class WaitingEnemy extends Enemy {
  timeLeft = 1000 * 20 * Math.random()
  constructor(pos: Vec) {
    super(pos, originVec, "waitingEnemy")
  }
  update(delta: number) {
    super.update(delta)
    if (this.timeLeft <= 0) return
    this.timeLeft -= delta
    if (this.timeLeft > 0) return
    this.setVel(velTowardsCenter(this.pos, 70/1000))
  }
}

const waitingEnemy = (pos: Vec) => new WaitingEnemy(pos)

class WizEnemy extends Enemy {
  static readonly spawnTimeFull = 1000 * 10
  timeToNewSpawn = WizEnemy.spawnTimeFull
  constructor(pos: Vec) {
    super(pos, originVec, "wizEnemy")
  }
  update(delta: number) {
    this.timeToNewSpawn -= delta
    if (this.timeToNewSpawn <= 0) {
      // TODO animate
      spawnEnemy(basicEnemy)
      this.timeToNewSpawn = WizEnemy.spawnTimeFull
    }
  }
}

const wizEnemy = (pos: Vec) => new WizEnemy(pos)

class GreyGooEnemy extends Enemy {
  static readonly spawnTimeFull = 1000 * 5
  timeToNewSpawn = GreyGooEnemy.spawnTimeFull
  static readonly defltSpawnsLeft = 10
  readonly spawnsLeft: number
  constructor(pos: Vec, spawnsLeft: number) {
    super(pos, velTowardsCenter(pos, 10/1000), "greyGooEnemy")
    this.spawnsLeft = spawnsLeft
    this.givesPoints = spawnsLeft == GreyGooEnemy.defltSpawnsLeft
  }
  update(delta: number) {
    super.update(delta)
    if (this.spawnsLeft == 0) return
    this.timeToNewSpawn -= delta
    if (this.timeToNewSpawn <= 0) {
      spawnEnemy(greyGooEnemy(this.spawnsLeft-1), addVecs(this.pos, randomRadiusVec(50)))
      this.timeToNewSpawn = GreyGooEnemy.spawnTimeFull
    }
  }
}

const greyGooEnemy = (spawnsLeft: number) => (pos: Vec) => new GreyGooEnemy(pos, spawnsLeft)
const greyGooEnemyDeflt = greyGooEnemy(GreyGooEnemy.defltSpawnsLeft)

class ScaredEnemy extends Enemy {
  readonly towardsVec: Vec
  readonly awayVec: Vec
  constructor(pos: Vec) {
    super(pos, velTowardsCenter(pos, 50/1000), "scaredEnemy")
    this.towardsVec = this.vel
    this.awayVec = velTowardsCenter(pos, -60/1000)
  }
  update(delta: number) {
    super.update(delta)
    if (vecMagnitudeSq(subVecs(player.pos, this.pos)) < 100*100)
      this.setVel(this.awayVec)
    else
      this.setVel(this.towardsVec)
  }
}

const scaredEnemy = (pos: Vec) => new ScaredEnemy(pos)

class SwirlEnemy extends Enemy {
  timeToUpdate = 0
  static readonly updateTimeFull = 1000 / 10
  constructor(pos: Vec) {
    super(pos, originVec, "swirlEnemy")
  }
  update(delta: number) {
    super.update(delta)
    this.timeToUpdate -= delta
    if (this.timeToUpdate <= 0) {
      this.setVel(velCenterBlend(this.pos, 50/1000, 100/1000))
      this.timeToUpdate = SwirlEnemy.updateTimeFull
    }
  }
}

const swirlEnemy = (pos: Vec) => new SwirlEnemy(pos)

class TpEnemy extends Enemy {
  static readonly tpTimeFull = 1000 * 3
  timeToTp = TpEnemy.tpTimeFull
  constructor(pos: Vec) {
    super(pos, velTowardsCenter(pos, 50/1000), "tpEnemy")
  }
  update(delta: number) {
    super.update(delta)
    this.timeToTp -= delta
    if (this.timeToTp <= 0) {
      this.pos = addVecs(this.pos, velCenterBlend(this.pos, 50, 100))
      this.setVel(velTowardsCenter(this.pos, 50/1000))
      this.timeToTp = TpEnemy.tpTimeFull
    }
  }
}

const tpEnemy = (pos: Vec) => new TpEnemy(pos)

function removeEnemy(enemy: Enemy) {
  const indexA = enemyList.findIndex((e) => e === enemy)
  if (indexA !== undefined)
    enemyList.splice(indexA, 1)
  const indexB = objectList.findIndex((e) => e === enemy)
  if (indexB !== undefined)
    objectList.splice(indexB, 1)
  if (enemy.givesPoints)
    score += 1
}

// GAME STATE
let player: Player
let enemyList: Enemy[]
let objectList: (Renderable & Updatable)[]
let score: number
let timeToEnemySpawn: number
let timer: number
let gameIsOver: boolean = true
let gameIsTut: boolean = false

function spawnEnemy(ctor: (v: Vec) => Enemy, pos?: Vec) {
  pos = pos ?? addVecs(centerVec, randomRadiusVec(outerRadius))
  const enemy = ctor(pos)
  enemyList.push(enemy)
  objectList.push(enemy)
}

function update(delta: number) {
  objectList.forEach((r) => r.update(delta))
  timeToEnemySpawn -= delta
  if (timeToEnemySpawn <= 0) {
    timeToEnemySpawn = 1000 * 10
    const numSpawnsDec = Math.floor(Math.random() * 2)
    for (let i = 0; i <= numSpawnsDec; i++) {
      const rng = Math.random()
      if (rng < 1/7)
        spawnEnemy(wizEnemy)
      else if (rng < 2/7)
        spawnEnemy(waitingEnemy)
      else if (rng < 3/6)
        spawnEnemy(greyGooEnemyDeflt)
      else if (rng < 4/7)
        spawnEnemy(scaredEnemy)
      else if (rng < 5/7)
        spawnEnemy(swirlEnemy)
      else if (rng < 6/7)
        spawnEnemy(tpEnemy)
      else {
        spawnEnemy(basicEnemy)
        spawnEnemy(basicEnemy)
      }
    }
  }
}

function gameOver() {
  if (gameIsOver) return
  clearInterval(timer)
  gameIsOver = true
  objectList.push(new TextObj("Game over! Press R to play again", 100))
}

function initGame() {
  player = new Player()
  enemyList = []
  objectList = [new Background, new ScoreObj, new Center, player]
  score = 0
  timeToEnemySpawn = 0

  let lastUpdate = Date.now()
  timer = window.setInterval(() => {
    const newNow = Date.now()
    const delta = newNow - lastUpdate
    lastUpdate = newNow
    update(delta)
  }, 1000/60)

  gameIsOver = false
  gameIsTut = false
}

function initTut() {
  player = new Player()
  enemyList = []
  objectList = [new Background, new Center, player, new TextObj("Use arrow keys to move.", 50), new TextObj("Don't const any monsters get to the center.", 100), new TextObj("Press space to begin.", 150)]
  score = 0
  timeToEnemySpawn = 0
  gameIsOver = false
  gameIsTut = true
}

function resetGame() {
  gameOver()
  initGame()
}

const enumDirMap: { [s: string]: Direction } = {
  "ArrowLeft": Direction.Left,
  "ArrowRight": Direction.Right,
  "ArrowUp": Direction.Up,
  "ArrowDown": Direction.Down,
}

const keysDown = {
  [Direction.Left]: false,
  [Direction.Right]: false,
  [Direction.Up]: false,
  [Direction.Down]: false,
}

const alertKey = (upOrDown: boolean) => (event: KeyboardEvent) => {
  if (event.code == "KeyR" && !upOrDown && !gameIsTut) {
    resetGame()
  } else if (event.code == "Space" && !upOrDown && gameIsTut) {
    resetGame()
  } else {
    const dir = enumDirMap[event.code]
    if (dir === undefined) return
    keysDown[dir] = upOrDown
    let addedDir = originVec
    allDirections.forEach((dir) => { addedDir = addVecs(addedDir, keysDown[dir] ? dirVecMap[dir] : originVec) })
    player.keysChanged(addedDir)
  }
}

document.addEventListener("keydown", alertKey(true), false)
document.addEventListener("keyup", alertKey(false), false)

initTut()

function checkContext(x: CanvasRenderingContext2D | null): CanvasRenderingContext2D {
  if (x === null)
    throw "null rendering context"
  return x
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement
const context = checkContext(canvas.getContext("2d"))

function renderScreen() {
  window.requestAnimationFrame(renderScreen)
  objectList.forEach((r) => r.render(context, canvas.width, canvas.height))
}
renderScreen()
