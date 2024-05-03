export class EventScheduler {
  constructor(world, tps) {
    this.world = world;
    this.ticksPerSecond = tps;
    this.msPerTick = 1000 / this.ticksPerSecond;
    this.pool = [];
    this.lastTickTime = null;
    this.ticks = 0;
  }

  scheduleInterval(callback, interval) {
    this.pool.push({
      type: 'interval',
      callback: callback,
      interval: interval,
      lastCalledTicks: null
    });
  }

  tick() {
    if (this.lastTickTime !== null && this.world.p5.millis() - this.lastTickTime < this.msPerTick) return;

    this.lastTickTime = this.world.p5.millis();
    this.ticks++;

    this.pool.forEach(object => {
      if (object.type === 'interval') {
        if (object.lastCalledTicks === null || this.ticks - object.lastCalledTicks >= object.interval) {
          object.lastCalledTicks = this.ticks;
          object.callback(this.world);
        }
      }
    });
  }
}
