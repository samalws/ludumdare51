interface Renderable {
  render: (ctx: CanvasRenderingContext2D, xSize: number, ySize: number) => void
}

interface Updatable {
  update: (delta: number) => void
}

enum Direction {
  Up,
  Down,
  Left,
  Right,
}

let allDirections = [ Direction.Up, Direction.Down, Direction.Left, Direction.Right ]

type Vec = { x: number, y: number }

function addVecs(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y }
}

class Background implements Renderable, Updatable {
  constructor() {}
  render(ctx: CanvasRenderingContext2D, xSize: number, ySize: number) {
    ctx.fillStyle = "rgb(0, 0, 0)"
    ctx.fillRect(0, 0, xSize, ySize)
  }
  update(delta: number) {}
}

class ExampleRect implements Renderable, Updatable {
  x = 10
  y = 10
  constructor() {}
  render(ctx: CanvasRenderingContext2D, xSize: number, ySize: number) {
    ctx.fillStyle = "rgb(200, 0, 0)"
    ctx.fillRect(this.x, this.y, 50, 50)
  }
  update(delta: number) {
    this.x += delta*10/1000
  }
}

let objectList: (Renderable & Updatable)[] = [new Background(), new ExampleRect()]

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
  objectList.forEach((r) => r.update(delta))
}, 1000/60)

let enumKeyMap = {
  "ArrowLeft": Direction.Left,
  "ArrowRight": Direction.Right,
  "ArrowUp": Direction.Up,
  "ArrowDown": Direction.Down,
}

let keyVecMap = {
  [Direction.Left]: { x: -1, y: 0 },
  [Direction.Right]: { x: 1, y: 0 },
  [Direction.Up]: { x: 0, y: -1 },
  [Direction.Down]: { x: 0, y: 1 },
}

let keysDown = {
  [Direction.Left]: false,
  [Direction.Right]: false,
  [Direction.Up]: false,
  [Direction.Down]: false,
}

let alertKey = (upOrDown: boolean) => (event: KeyboardEvent) => {
  let dir = enumKeyMap[event.code]
  if (dir === undefined) { return }
  keysDown[dir] = upOrDown
  var addedDir = { x: 0, y: 0 }
  allDirections.forEach((dir) => { addedDir = addVecs(addedDir, keysDown[dir] ? keyVecMap[dir] : { x: 0, y: 0 }) })
  console.log(addedDir)
}

document.addEventListener("keydown", alertKey(true), false)
document.addEventListener("keyup", alertKey(false), false)
