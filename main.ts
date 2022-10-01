interface Renderable {
  render: (ctx: CanvasRenderingContext2D, xSize: number, ySize: number) => void
}

interface Updatable {
  update: (delta: number) => void
}

interface HasHitbox {
  pos: Vec
  size: Vec
}

enum Direction {
  Up,
  Down,
  Left,
  Right,
}

let allDirections = [ Direction.Up, Direction.Down, Direction.Left, Direction.Right ]

type Vec = { x: number, y: number }

let dirVecMap = {
  [Direction.Left]: { x: -1, y: 0 },
  [Direction.Right]: { x: 1, y: 0 },
  [Direction.Up]: { x: 0, y: -1 },
  [Direction.Down]: { x: 0, y: 1 },
}

let originVec: Vec = { x: 0, y: 0 }
let centerVec: Vec = { x: 600, y: 600 }
let radius = 500

function addVecs(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y }
}

function subVecs(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y }
}

function mulVec(a: Vec, n: number): Vec {
  return { x: a.x * n, y: a.y * n }
}

function unitVec(a: Vec): Vec {
  let mag = vecMagnitude(a)
  return mulVec(a, mag == 0 ? 0 : (1/mag))
}

function vecMagnitudeSq(a: Vec): number {
  return a.x*a.x + a.y*a.y
}

function vecMagnitude(a: Vec): number {
  return Math.sqrt(vecMagnitudeSq(a))
}

function hitboxesCollide(a: HasHitbox, b: HasHitbox): boolean {
  let a1 = a.pos
  let a2 = addVecs(a.pos, a.size)
  let b1 = b.pos
  let b2 = addVecs(b.pos, b.size)
  let xInside = (a1.x <= b1.x && a2.x >= b1.x) || (a1.x >= b1.x && a1.x <= b2.x)
  let yInside = (a1.y <= b1.y && a2.y >= b1.y) || (a1.y >= b1.y && a1.y <= b2.y)
  return xInside && yInside
}

let imgs: { [name: string]: HTMLImageElement[] } = {}

function loadImg(name: string, num: number) {
  let imgList: HTMLImageElement[] = []
  for (var i = 1; i <= num; i++) {
    let img = new Image
    img.src = name + i + ".png"
    imgList.push(img)
  }
  imgs[name] = imgList
}

loadImg("player", 2)
loadImg("enemy", 2)
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
  size: Vec
  vel: Vec
  imgs: HTMLImageElement[]
  imgIndex = 0
  frameCtr: number
  invFramerate: number
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
    let size = { x: 10, y: 10 }
    super(centerVec, { x: 10, y: 10 }, originVec, "center")
  }
  update(delta: number) {
    super.update(delta)
    enemyList.forEach((e) => { if (hitboxesCollide(this, e)) gameOver() })
  }
}

class Player extends GameObject {
  constructor() {
    super(centerVec, { x: 50, y: 50 }, originVec, "player")
  }
  update(delta: number) {
    super.update(delta)
    enemyList.forEach((e) => { if (hitboxesCollide(this, e)) removeEnemy(e) })
  }
  keysChanged(velNew: Vec) {
    this.vel = mulVec(velNew, 100/1000)
  }
}

class BasicEnemy extends GameObject {
  constructor(pos: Vec) {
    super(pos, { x: 50, y: 50 }, mulVec(unitVec(subVecs(centerVec, pos)), 10/1000), "enemy")
  }
}

function removeEnemy(enemy: Renderable & Updatable & HasHitbox) {
  let indexA = enemyList.findIndex((e) => e === enemy)
  if (indexA !== undefined)
    enemyList.splice(indexA, 1)
  let indexB = objectList.findIndex((e) => e === enemy)
  if (indexB !== undefined)
    objectList.splice(indexB, 1)
  score += 1
}

// GAME STATE
var player: Player
var enemyList: (Renderable & Updatable & HasHitbox)[]
var objectList: (Renderable & Updatable)[]
var score: number
var timeToEnemySpawn: number
var timer: number
var gameIsOver: boolean = true
var gameIsTut: boolean = false

function spawnEnemy() {
  let theta = Math.random() * 2 * Math.PI
  let pos = addVecs(centerVec, { x: radius * Math.cos(theta), y: radius * Math.sin(theta) })
  let enemy = new BasicEnemy(pos)
  enemyList.push(enemy)
  objectList.push(enemy)
}

function update(delta: number) {
  objectList.forEach((r) => r.update(delta))
  timeToEnemySpawn -= delta
  if (timeToEnemySpawn <= 0) {
    timeToEnemySpawn = 1000 * 10
    spawnEnemy()
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

  var lastUpdate = Date.now()
  timer = window.setInterval(() => {
    let newNow = Date.now()
    let delta = newNow - lastUpdate
    lastUpdate = newNow
    update(delta)
  }, 1000/60)

  gameIsOver = false
  gameIsTut = false
}

function initTut() {
  player = new Player()
  enemyList = []
  objectList = [new Background, new Center, player, new TextObj("Use arrow keys to move.\nDon't let any monsters get to the center.\nPress space to begin.")]
  score = 0
  timeToEnemySpawn = 0
  gameIsOver = false
  gameIsTut = true
}

function resetGame() {
  gameOver()
  initGame()
}

let enumDirMap: { [s: string]: Direction } = {
  "ArrowLeft": Direction.Left,
  "ArrowRight": Direction.Right,
  "ArrowUp": Direction.Up,
  "ArrowDown": Direction.Down,
}

let keysDown = {
  [Direction.Left]: false,
  [Direction.Right]: false,
  [Direction.Up]: false,
  [Direction.Down]: false,
}

let alertKey = (upOrDown: boolean) => (event: KeyboardEvent) => {
  if (event.code == "KeyR" && !upOrDown && !gameIsTut) {
    resetGame()
  } else if (event.code == "Space" && !upOrDown && gameIsTut) {
    resetGame()
  } else {
    let dir = enumDirMap[event.code]
    if (dir === undefined) return
    keysDown[dir] = upOrDown
    var addedDir = originVec
    allDirections.forEach((dir) => { addedDir = addVecs(addedDir, keysDown[dir] ? dirVecMap[dir] : originVec) })
    player.keysChanged(addedDir)
  }
}

document.addEventListener("keydown", alertKey(true), false)
document.addEventListener("keyup", alertKey(false), false)

initTut()

let canvas = document.getElementById("canvas") as HTMLCanvasElement
let context = canvas.getContext("2d")

function renderScreen() {
  window.requestAnimationFrame(renderScreen)
  if (context === null) return // TODO why is --strict not happy with this?
  objectList.forEach((r) => r.render(context, canvas.width, canvas.height))
}
renderScreen()
