export class Camera {
  constructor(p5, world, x, y) {
    /** @type {p5} p5 */
    this.p5 = p5;

    this.actualX = x;
    this.actualY = y;
    this.actualZoom = 1;
    this.x = this.actualX;
    this.y = this.actualY;
    this.zoom = this.actualZoom;

    this.world = world;
    this.speed = 400;

    this.screenWidth = 0;
    this.screenHeight = 0;
  }

  move(dx, dy) {
    const dt = this.p5.deltaTime * 0.001;
    this.actualX += dx * this.speed * dt;
    this.actualY += dy * this.speed * dt;
    this.x = this._lerp(this.x, this.actualX, 0.2);
    this.y = this._lerp(this.y, this.actualY, 0.2);
    this.zoom = this._lerp(this.zoom, this.actualZoom, 0.4);
  }

  draw(defaultSize) {
    this.p5.translate(-this.x, -this.y);
    this.world.update();
    this.world.draw(defaultSize * this.zoom);
  }

  update(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  scrollZoom(delta) {
    this.actualZoom += -delta * 0.0025;
    this.actualZoom = Math.max(Math.min(this.actualZoom, 9), 1);
  }

  screenToCoordinates(x, y) {
    return [(x + this.x) / this.world.imageRatio + this.world.worldSize / 2, (y + this.y) / this.world.imageRatio + this.world.worldSize / 2];
  }

  _lerp(a, b, v) {
    return a + (b - a) * v;
  }

  visibilityRange() {
    const [x, y] = this.screenToCoordinates(this.screenWidth / 2, this.screenHeight / 2);
    return [
      x - this.screenWidth / 2 / this.world.imageRatio,
      x + this.screenWidth / 2 / this.world.imageRatio,
      y - this.screenHeight / 2 / this.world.imageRatio,
      y + this.screenHeight / 2 / this.world.imageRatio
    ];
  }
}