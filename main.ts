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
let centerVec: Vec = { x: 500, y: 500 }
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

class Background implements Renderable, Updatable {
  constructor() {}
  render(ctx: CanvasRenderingContext2D, xSize: number, ySize: number) {
    ctx.fillStyle = "rgb(0, 0, 0)"
    ctx.fillRect(0, 0, xSize, ySize)
  }
  update(delta: number) {}
}

class GameObject implements Renderable, Updatable, HasHitbox {
  pos: Vec
  size: Vec
  vel: Vec
  color: string
  constructor(pos, size, vel, color) { this.pos = pos; this.size = size; this.vel = vel; this.color = color }
  render(ctx: CanvasRenderingContext2D, xSize: number, ySize: number) {
    ctx.fillStyle = this.color
    ctx.fillRect(this.pos.x, this.pos.y, this.size.x, this.size.y)
  }
  update(delta: number) {
    this.pos = addVecs(this.pos, mulVec(this.vel, delta))
  }
}

class Center extends GameObject {
  constructor() {
    let size = { x: 10, y: 10 }
    super(subVecs(centerVec, mulVec(size, .5)), size, originVec, "rgb(0, 0, 200)")
  }
  update(delta: number) {
    super.update(delta)
    enemyList.forEach((e) => { if (hitboxesCollide(this, e)) gameOver() })
  }
}

class Player extends GameObject {
  constructor() {
    super(centerVec, { x: 50, y: 50 }, originVec, "rgb(0, 200, 200)")
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
    super(pos, { x: 50, y: 50 }, mulVec(unitVec(subVecs(centerVec, pos)), 10/1000), "rgb(200, 0, 0)")
  }
}

function removeEnemy(enemy) {
  let indexA = enemyList.findIndex((e) => e === enemy)
  if (indexA !== undefined)
    enemyList.splice(indexA, 1)
  let indexB = objectList.findIndex((e) => e === enemy)
  if (indexB !== undefined)
    objectList.splice(indexB, 1)
}

// GAME STATE
let player = new Player()
let enemyList: (Renderable & Updatable & HasHitbox)[] = []
let objectList: (Renderable & Updatable)[] = [new Background, new Center, player]
var timeToEnemySpawn = 0

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
  alert("Game over")
}

let canvas = document.getElementById("canvas") as HTMLCanvasElement
let context = canvas.getContext("2d")

function renderScreen() {
  window.requestAnimationFrame(renderScreen)
  objectList.forEach((r) => r.render(context, canvas.width, canvas.height))
}
renderScreen()

var lastUpdate = Date.now()
window.setInterval(() => {
  let newNow = Date.now()
  let delta = newNow - lastUpdate
  lastUpdate = newNow
  update(delta)
}, 1000/60)

let enumDirMap = {
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
  let dir = enumDirMap[event.code]
  if (dir === undefined) return
  keysDown[dir] = upOrDown
  var addedDir = originVec
  allDirections.forEach((dir) => { addedDir = addVecs(addedDir, keysDown[dir] ? dirVecMap[dir] : originVec) })
  player.keysChanged(addedDir)
}

document.addEventListener("keydown", alertKey(true), false)
document.addEventListener("keyup", alertKey(false), false)
