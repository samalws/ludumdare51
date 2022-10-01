interface Renderable {
  render: (ctx: CanvasRenderingContext2D, xSize: number, ySize: number) => void
}

interface Updatable {
  update: (delta: number) => void
}

interface HasHitbox {
  readonly pos: Vec
  readonly size: Vec
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
const innerRadius = 100
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
  const a1 = a.pos
  const a2 = addVecs(a.pos, a.size)
  const b1 = b.pos
  const b2 = addVecs(b.pos, b.size)
  const xInside = (a1.x <= b1.x && a2.x >= b1.x) || (a1.x >= b1.x && a1.x <= b2.x)
  const yInside = (a1.y <= b1.y && a2.y >= b1.y) || (a1.y >= b1.y && a1.y <= b2.y)
  return xInside && yInside
}

const imgs: { [name: string]: HTMLImageElement[] } = {}

function loadImg(name: string, num: number) {
  const imgList: HTMLImageElement[] = []
  for (let i = 1; i <= num; i++) {
    const img = new Image
    img.src = name + i + ".png"
    imgList.push(img)
  }
  imgs[name] = imgList
}

loadImg("player", 2)
loadImg("enemy", 2)
loadImg("waitingEnemy", 1)
loadImg("wizEnemy", 1)
loadImg("greyGooEnemy", 1)
loadImg("center", 1)

class Background implements Renderable, Updatable {
  constructor() {}
  render(ctx: CanvasRenderingContext2D, xSize: number, ySize: number) {
    ctx.fillStyle = "rgb(0, 0, 0)"
    ctx.fillRect(0, 0, xSize, ySize)
  }
  update(delta: number) {}
}

class TextObj implements Renderable, Updatable {
  text: string
  constructor(text: string) { this.text = text }
  render(ctx: CanvasRenderingContext2D, xSize: number, ySize: number) {
    ctx.font = "48px sans-serif"
    ctx.fillStyle = "rgb(200, 0, 0)"
    ctx.fillText(this.text, 10, 50)
  }
  update(delta: number) {}
}

class ScoreObj extends TextObj {
  constructor() { super("0") }
  update(delta: number) {
    this.text = "" + score
  }
}

class GameObject implements Renderable, Updatable, HasHitbox {
  pos: Vec
  readonly size: Vec
  vel: Vec
  readonly imgs: HTMLImageElement[]
  imgIndex = 0
  frameCtr: number
  readonly invFramerate: number
  constructor(pos: Vec, size: Vec, vel: Vec, imgName: string, framerateHz: number = 30) {
    this.pos = subVecs(pos, mulVec(size, .5))
    this.size = size
    this.vel = vel
    this.imgs = imgs[imgName]
    this.invFramerate = 1000/framerateHz
    this.frameCtr = this.invFramerate
  }
  render(ctx: CanvasRenderingContext2D, xSize: number, ySize: number) {
    ctx.drawImage(this.imgs[this.imgIndex], this.pos.x, this.pos.y)
  }
  update(delta: number) {
    this.pos = addVecs(this.pos, mulVec(this.vel, delta))
    this.frameCtr -= delta
    if (this.frameCtr <= 0) {
      this.imgIndex = (this.imgIndex+1) % this.imgs.length
      this.frameCtr = this.invFramerate
    }
  }
}

class Center extends GameObject {
  constructor() {
    super(centerVec, vec(10, 10), originVec, "center")
  }
  update(delta: number) {
    super.update(delta)
    enemyList.forEach((e) => { if (hitboxesCollide(this, e)) gameOver() })
  }
}

const oneOverSqrt2 = 1/Math.sqrt(2)

class Player extends GameObject {
  readonly relCenter: Vec
  constructor() {
    const size: Vec = vec(25, 25)
    super(addVecs(centerVec, vec(0, innerRadius)), size, originVec, "player")
    this.relCenter = subVecs(centerVec, mulVec(size, .5))
  }
  update(delta: number) {
    super.update(delta)
    enemyList.forEach((e) => { if (hitboxesCollide(this, e)) removeEnemy(e) })

    const relPos = subVecs(this.pos, this.relCenter)
    const distFromCenterSq = vecMagnitudeSq(relPos)
    if (distFromCenterSq < innerRadiusSq)
      this.pos = addVecs(this.relCenter, mulVec(relPos, innerRadius/Math.sqrt(distFromCenterSq)))
  }
  keysChanged(velNew: Vec) {
    if (vecMagnitudeSq(velNew) == 2)
      velNew = mulVec(velNew, oneOverSqrt2)
    this.vel = mulVec(velNew, 100/1000)
  }
}

function velTowardsCenter(pos: Vec, speed: number): Vec {
  return mulVec(unitVec(subVecs(centerVec, pos)), speed)
}

class BasicEnemy extends GameObject {
  constructor(pos: Vec) {
    super(pos, vec(50, 50), velTowardsCenter(pos, 50/1000), "enemy")
  }
}

const basicEnemy = (pos: Vec) => new BasicEnemy(pos)

class WaitingEnemy extends GameObject {
  timeLeft = 1000 * 20 * Math.random()
  constructor(pos: Vec) {
    super(pos, vec(50, 50), originVec, "waitingEnemy")
  }
  update(delta: number) {
    super.update(delta)
    if (this.timeLeft <= 0) return
    this.timeLeft -= delta
    if (this.timeLeft > 0) return
    this.vel = velTowardsCenter(this.pos, 70/1000)
  }
}

const waitingEnemy = (pos: Vec) => new WaitingEnemy(pos)

class WizEnemy extends GameObject {
  static readonly spawnTimeFull = 1000 * 7
  timeToNewSpawn = WizEnemy.spawnTimeFull
  constructor(pos: Vec) {
    super(pos, vec(40, 40), originVec, "wizEnemy")
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

class GreyGooEnemy extends GameObject {
  // will make 2^((outerRadius/speed)/spawnTimeFull) = 2^((500/10)/5) = 2^10 = 1024 clones before reaching center
  static readonly spawnTimeFull = 1000 * 5
  timeToNewSpawn = GreyGooEnemy.spawnTimeFull
  constructor(pos: Vec) {
    super(pos, vec(25, 25), velTowardsCenter(pos, 10/1000), "greyGooEnemy")
  }
  update(delta: number) {
    super.update(delta)
    this.timeToNewSpawn -= delta
    if (this.timeToNewSpawn <= 0) {
      spawnEnemy(greyGooEnemy, addVecs(this.pos, randomRadiusVec(50)))
      this.timeToNewSpawn = GreyGooEnemy.spawnTimeFull
    }
  }
}

const greyGooEnemy = (pos: Vec) => new GreyGooEnemy(pos)

function removeEnemy(enemy: Renderable & Updatable & HasHitbox) {
  const indexA = enemyList.findIndex((e) => e === enemy)
  if (indexA !== undefined)
    enemyList.splice(indexA, 1)
  const indexB = objectList.findIndex((e) => e === enemy)
  if (indexB !== undefined)
    objectList.splice(indexB, 1)
  score += 1
}

// GAME STATE
let player: Player
let enemyList: (Renderable & Updatable & HasHitbox)[]
let objectList: (Renderable & Updatable)[]
let score: number
let timeToEnemySpawn: number
let timer: number
let gameIsOver: boolean = true
let gameIsTut: boolean = false

function spawnEnemy(ctor: (v: Vec) => (Renderable & Updatable & HasHitbox), pos?: Vec) {
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
    const rng = Math.random()
    if (rng < .25)
      spawnEnemy(wizEnemy)
    else if (rng < .5)
      spawnEnemy(waitingEnemy)
    else if (rng < .75)
      spawnEnemy(greyGooEnemy)
    else {
      spawnEnemy(basicEnemy)
      spawnEnemy(basicEnemy)
    }
  }
}

function gameOver() {
  if (gameIsOver) return
  clearInterval(timer)
  gameIsOver = true
  objectList.push(new TextObj("Game over! Press R to play again"))
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
  objectList = [new Background, new Center, player, new TextObj("Use arrow keys to move.\nDon't const any monsters get to the center.\nPress space to begin.")]
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
