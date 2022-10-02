const oneOverSqrt2 = 1/Math.sqrt(2)
const imgWidthToRadius = .5*Math.sqrt(2)
const epsilon = .0001

interface Renderable {
  render: (ctx: CanvasRenderingContext2D) => void
}

interface Updatable {
  update: (delta: Delta) => void
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

const canvasSize = 1200
const originVec = vec(0, 0)
const centerVec = vec(600, 600)
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
loadImg("basicEnemy")
loadImg("waitingEnemy")
loadImg("wizEnemy")
loadImg("greyGooEnemy")
loadImg("scaredEnemy")
loadImg("swirlEnemy")
loadImg("tpEnemy")
loadImg("protoBasicEnemy")
loadImg("center")

class Delta {
  static readonly rotMul = 1*(Math.PI/180)/1000
  readonly delta: number
  readonly cosRot: number
  readonly sinRot: number
  constructor(delta: number) {
    this.delta = delta
    this.cosRot = Math.cos(delta*Delta.rotMul)
    this.sinRot = Math.sin(delta*Delta.rotMul)
  }
  rotateVec(v: Vec): Vec {
    return vec(v.x * this.cosRot - v.y * this.sinRot, v.x * this.sinRot + v.y * this.cosRot)
  }
}

function genBackgroundStars(): Vec[] {
  const stars: Vec[] = []
  const genRad = imgWidthToRadius * canvasSize
  const genDiam = genRad*2
  for (let i = 0; i < 1000; i++) // 500 * sqrt(2) * sqrt(2)
    stars.push(vec(Math.random() * genDiam - genRad, Math.random() * genDiam - genRad))
  return stars
}

function rotBackgroundStars(stars: Vec[], delta: Delta): Vec[] {
  return stars.map((s) => delta.rotateVec(s))
}

class Background implements Renderable, Updatable {
  static stars = genBackgroundStars()
  constructor() {}
  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#2A324B"
    ctx.fillRect(0, 0, canvasSize, canvasSize)
    ctx.fillStyle = "#FFFFFF"
    Background.stars.forEach((s) => ctx.fillRect(s.x + centerVec.x, s.y + centerVec.y, 2, 2))
  }
  update(delta: Delta) {
    Background.stars = rotBackgroundStars(Background.stars, delta)
  }
}

class TextObj implements Renderable, Updatable {
  text: string
  readonly height: number
  constructor(text: string, height: number) {
    this.text = text
    this.height = height
  }
  render(ctx: CanvasRenderingContext2D) {
    ctx.font = "48px sans-serif"
    ctx.fillStyle = "#E58F65"
    ctx.fillText(this.text, 10, this.height)
  }
  update(delta: Delta) {}
}

class ScoreObj extends TextObj {
  constructor() { super("0", 50) }
  update(delta: Delta) {
    this.text = "" + score
  }
}

class Particle implements Renderable, Updatable {
  pos: Vec
  angle: number
  readonly vel: Vec
  readonly angVel: number
  lifetime: number
  static readonly angVelMax = 2/1000
  static readonly lifetimeMax = .1*1000
  static readonly colors = ["#ff000055", "#ff880055"] // TODO
  color: string
  constructor(pos: Vec, vel: Vec) {
    this.pos = pos
    this.vel = vel
    this.angle = Math.random() * 2 * Math.PI
    this.angVel = Math.random() * 2 * Particle.angVelMax - Particle.angVelMax
    this.lifetime = Math.random() * Particle.lifetimeMax
    this.color = Particle.colors[Math.floor(Math.random() * Particle.colors.length)]
  }
  render(ctx: CanvasRenderingContext2D) {
    ctx.translate(this.pos.x, this.pos.y)
    ctx.rotate(this.angle)
    ctx.fillStyle = this.color
    ctx.fillRect(-10, -10, 20, 20)
  }
  update(delta: Delta) {
    this.pos = addVecs(this.pos, mulVec(this.vel, delta.delta))
    this.angle += this.angVel * delta.delta
    this.lifetime -= delta.delta
    if (this.lifetime < 0)
      removeFromList(this, objectList)
  }
}

class GameObject implements Renderable, Updatable, HasHitbox {
  pos: Vec
  vel: Vec
  readonly img: HTMLImageElement
  static readonly particleTimeFull = .05 * 1000
  timeToParticle = GameObject.particleTimeFull
  readonly particleSpeed: number
  constructor(pos: Vec, vel: Vec, imgName: string, particleSpeed: number = 300/1000) {
    this.pos = pos
    this.vel = vel
    this.setVel(vel)
    this.img = imgs[imgName]
    this.particleSpeed = particleSpeed
  }
  imgAngle = 0
  render(ctx: CanvasRenderingContext2D) {
    ctx.translate(this.pos.x, this.pos.y)
    ctx.rotate(this.imgAngle)
    ctx.drawImage(this.img, -this.img.width*.5, -this.img.height*.5)
  }
  update(delta: Delta) {
    this.pos = addVecs(this.pos, mulVec(this.vel, delta.delta))
    this.pos = addVecs(centerVec, delta.rotateVec(subVecs(this.pos, centerVec)))

    this.timeToParticle -= delta.delta
    if (this.timeToParticle <= 0) {
      const velMagSq = vecMagnitudeSq(this.vel)
      if (velMagSq > epsilon) {
        const negVelUnit = mulVec(this.vel, -1/Math.sqrt(velMagSq))
        const particlePos = addVecs(this.pos, mulVec(negVelUnit, this.getRadius()))
        const particleVel = mulVec(negVelUnit, this.particleSpeed)
        objectList.splice(1,0,new Particle(particlePos, particleVel))
      }
      this.timeToParticle = GameObject.particleTimeFull
    }
  }
  setVel(newVel: Vec) {
    this.vel = newVel
    if (vecMagnitudeSq(newVel) > epsilon)
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
  update(delta: Delta) {
    super.update(delta)
    enemyList.forEach((e) => { if (hitboxesCollide(this, e)) gameOver() })
  }
}

class Player extends GameObject {
  constructor() {
    super(addVecs(centerVec, vec(0, innerRadius + 50)), originVec, "player")
  }
  update(delta: Delta) {
    super.update(delta)
    enemyList.forEach((e) => { if (hitboxesCollide(this, e)) removeEnemy(e) })

    const relPos = subVecs(this.pos, centerVec)
    const distFromCenterSq = vecMagnitudeSq(relPos)
    if (distFromCenterSq < innerRadiusSq)
      this.pos = addVecs(centerVec, mulVec(relPos, innerRadius/Math.sqrt(distFromCenterSq)))
  }
  keysChanged(velNew: Vec) {
    const mag = vecMagnitudeSq(velNew)
    if (mag == 2)
      velNew = mulVec(velNew, oneOverSqrt2)
    this.setVel(mulVec(velNew, 100/1000))

    try {
      if (mag == 0)
        engineAudio.pause()
      else
        engineAudio.play()
    } catch (err) {
      console.error(err)
    }
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
  constructor(pos: Vec, vel: Vec, imgName: string, particleSpeed: number = 300/1000) {
    super(pos, vel, imgName, particleSpeed)
  }
}

class BasicEnemy extends Enemy {
  timeToUpdate = 0
  static readonly updateTimeFull = 1000 / 10
  constructor(pos: Vec) {
    super(pos, originVec, "basicEnemy")
  }
  update(delta: Delta) {
    super.update(delta)
    this.timeToUpdate -= delta.delta
    if (this.timeToUpdate <= 0) {
      this.setVel(velTowardsCenter(this.pos, 50/1000))
      this.timeToUpdate = BasicEnemy.updateTimeFull
    }
  }
}

const basicEnemy = (pos: Vec) => new BasicEnemy(pos)

class WaitingEnemy extends Enemy {
  timeLeft = 1000 * 20 * Math.random()
  constructor(pos: Vec) {
    super(pos, originVec, "waitingEnemy")
  }
  update(delta: Delta) {
    super.update(delta)
    if (this.timeLeft <= 0) return
    this.timeLeft -= delta.delta
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
  update(delta: Delta) {
    super.update(delta)
    this.timeToNewSpawn -= delta.delta
    if (this.timeToNewSpawn <= 0) {
      objectList.splice(1,0,new ProtoBasicEnemy(this.pos, addVecs(centerVec, randomRadiusVec(outerRadius))))
      this.timeToNewSpawn = WizEnemy.spawnTimeFull

      playSfx("wiz")
    }
  }
}

const wizEnemy = (pos: Vec) => new WizEnemy(pos)

class GreyGooEnemy extends Enemy {
  timeToUpdate = 0
  static readonly updateTimeFull = 1000 / 10

  static readonly spawnTimeFull = 1000 * 5
  timeToNewSpawn = GreyGooEnemy.spawnTimeFull
  static readonly defltSpawnsLeft = 10
  readonly spawnsLeft: number

  constructor(pos: Vec, spawnsLeft: number) {
    super(pos, originVec, "greyGooEnemy")
    this.spawnsLeft = spawnsLeft
    this.givesPoints = spawnsLeft == GreyGooEnemy.defltSpawnsLeft
  }
  update(delta: Delta) {
    super.update(delta)

    this.timeToUpdate -= delta.delta
    if (this.timeToUpdate <= 0) {
      this.setVel(velTowardsCenter(this.pos, 10/1000))
      this.timeToUpdate = GreyGooEnemy.updateTimeFull
    }

    if (this.spawnsLeft == 0) return
    this.timeToNewSpawn -= delta.delta
    if (this.timeToNewSpawn <= 0) {
      spawnEnemy(greyGooEnemy(this.spawnsLeft-1), addVecs(this.pos, randomRadiusVec(50)))
      this.timeToNewSpawn = GreyGooEnemy.spawnTimeFull
    }
  }
}

const greyGooEnemy = (spawnsLeft: number) => (pos: Vec) => new GreyGooEnemy(pos, spawnsLeft)
const greyGooEnemyDeflt = greyGooEnemy(GreyGooEnemy.defltSpawnsLeft)

class ScaredEnemy extends Enemy {
  constructor(pos: Vec) {
    super(pos, originVec, "scaredEnemy")
  }
  update(delta: Delta) {
    super.update(delta)
    if (vecMagnitudeSq(subVecs(player.pos, this.pos)) < 100*100)
      this.setVel(velTowardsCenter(this.pos, -60/1000))
    else
      this.setVel(velTowardsCenter(this.pos, 50/1000))
  }
}

const scaredEnemy = (pos: Vec) => new ScaredEnemy(pos)

class SwirlEnemy extends Enemy {
  timeToUpdate = 0
  static readonly updateTimeFull = 1000 / 10
  constructor(pos: Vec) {
    super(pos, originVec, "swirlEnemy")
  }
  update(delta: Delta) {
    super.update(delta)
    this.timeToUpdate -= delta.delta
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
  update(delta: Delta) {
    super.update(delta)
    this.timeToTp -= delta.delta
    if (this.timeToTp <= 0) {
      this.pos = addVecs(this.pos, velCenterBlend(this.pos, 50, 100))
      this.setVel(velTowardsCenter(this.pos, 50/1000))
      this.timeToTp = TpEnemy.tpTimeFull

      playSfx("greyGoo")
    }
  }
}

const tpEnemy = (pos: Vec) => new TpEnemy(pos)

class ProtoBasicEnemy extends Enemy { // don't add to enemyList
  readonly targetPos: Vec
  timeToUpdate = 0
  static readonly updateTimeFull = 1000 / 10
  constructor(pos: Vec, targetPos: Vec) {
    super(pos, originVec, "protoBasicEnemy", 0)
    this.targetPos = targetPos
    this.givesPoints = false
  }
  update(delta: Delta) {
    super.update(delta)
    this.timeToUpdate -= delta.delta
    if (this.timeToUpdate <= 0) {
      this.setVel(mulVec(unitVec(subVecs(this.targetPos, this.pos)), 250/1000))
      this.timeToUpdate = ProtoBasicEnemy.updateTimeFull
    }
    if (vecMagnitudeSq(subVecs(this.pos, this.targetPos)) < 50*50) {
      spawnEnemy(basicEnemy, this.targetPos)
      removeEnemy(this)
    }
  }
}

function removeFromList<T>(x: T, l: T[]) {
  const index = l.findIndex((e) => e === x)
  if (index !== undefined && index !== -1)
    l.splice(index, 1)
}

function removeEnemy(enemy: Enemy) {
  removeFromList(enemy, enemyList)
  removeFromList(enemy, objectList)
  if (enemy.givesPoints)
    score += 1
  // explode
  for (let i = 0; i < 50; i++) {
    const radVec = randomRadiusVec(1)
    objectList.splice(1, 0, new Particle(addVecs(enemy.pos, mulVec(radVec, 20)), mulVec(radVec, 300/1000)))
  }
  playSfx("explosion")
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
  playSfx("enemySpawn")
}

let maxUpdateTime = 0
function update(delta: Delta) {
  const before = Date.now()

  objectList.forEach((r) => r.update(delta))
  timeToEnemySpawn -= delta.delta
  if (timeToEnemySpawn <= 0) {
    timeToEnemySpawn = 1000 * 10

    if (score == 0)
      spawnEnemy(basicEnemy)
    else if (score == 1) {
      spawnEnemy(swirlEnemy)
      spawnEnemy(tpEnemy)
    } else if (score == 2 || score == 3) {
      spawnEnemy(scaredEnemy)
      spawnEnemy(tpEnemy)
    } else {
      const numSpawns = (score < 16) ? 2 : (score < 64) ? 3 : 4
      for (let i = 0; i < numSpawns; i++) {
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

  maxUpdateTime = Math.max(maxUpdateTime, Date.now() - before)
}

function gameOver() {
  if (gameIsOver) return
  clearInterval(timer)
  gameIsOver = true
  objectList.push(new TextObj("Game over! Press R to play again.", 100))

  playSfx("gameover")
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
    const delta = new Delta(newNow - lastUpdate)
    lastUpdate = newNow
    update(delta)
  }, 1000/60)

  gameIsOver = false
  gameIsTut = false

  playSfx("gameBegin")
}

function initTut() {
  player = new Player()
  enemyList = []
  objectList = [
    new Background,
    new Center,
    player,
    new TextObj("Use arrow keys to move.", 50),
    new TextObj("Don't let any enemies get to the center.", 100),
    new TextObj("Touch an enemy to kill it.", 150),
    new TextObj("Press space to begin.", 200)
  ]
  score = 0
  timeToEnemySpawn = 0
  gameIsOver = false
  gameIsTut = true
}

function resetGame() {
  gameOver()
  initGame()
  try {
    songAudio.play()
  } catch (err) {
    console.error(err)
  }
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

function checkNullable<T>(x: T | null): T {
  if (x === null)
    throw "null value"
  return x
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement
const realCanvasSize = Math.min(window.innerWidth, window.innerHeight) * .9
canvas.width = realCanvasSize
canvas.height = realCanvasSize
const scaleFactor = realCanvasSize/canvasSize
const context = checkNullable(canvas.getContext("2d"))
context.scale(scaleFactor, scaleFactor)
context.save()

let maxRenderTime = 0
function renderScreen() {
  const before = Date.now()
  try {
    objectList.forEach((r) => {
      context.save()
      try { r.render(context) } catch (err) { console.error(err) }
      context.restore()
    })
  } catch (err) {
    console.error(err)
  }
  maxRenderTime = Math.max(maxRenderTime, Date.now() - before)

  window.requestAnimationFrame(renderScreen)
}
renderScreen()

const songAudio = new Audio("song.wav")
songAudio.loop = true

const engineAudio = new Audio("engineOn.wav")
engineAudio.loop = true

const sfxAudio: { [name: string]: HTMLAudioElement[] } = {}

function addSfx(name: string, n: number = 3) {
  const audioList: HTMLAudioElement[] = []
  for (let i = 0; i < n; i++)
    audioList.push(new Audio(name + ".wav"))
  sfxAudio[name] = audioList
}

addSfx("enemySpawn")
addSfx("explosion")
addSfx("gameBegin")
addSfx("gameBegin2") // TODO
addSfx("gameover")
addSfx("greyGoo")
addSfx("wiz")

function playSfx(name: string) {
  try {
    const audioList = sfxAudio[name]
    for (const audio of audioList)
      if (audio.paused) {
        audio.play()
        break
      }
  } catch (err) {
    console.error(err)
  }
}

window.setInterval(() => console.log("max render time:", maxRenderTime, ", max update time:", maxUpdateTime), 1000)
