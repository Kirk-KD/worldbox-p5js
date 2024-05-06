import * as assets from './assets.js';
import {ITEMS, Inventory} from './inventory.js';
import {HumanIdleAI} from "./ai.js";

export class Entity {
  static loadedSprites = [];

  constructor(world, x, y, size, pixelColor, health, simplifiedSprite, detailedSprite, detailedSpriteDefaultScale) {
    this.world = world;
    this.x = x;
    this.y = y;
    this.xOffset = 0;
    this.yOffset = 0;
    this.size = size;
    this.pixelColor = pixelColor;
    this.health = health;
    this.dead = false;

    this.simplifiedSprite = simplifiedSprite;
    if (this.simplifiedSprite !== null) {
      if (!Entity.loadedSprites.includes(this.simplifiedSprite)) {
        this.simplifiedSprite.loadPixels();
        Entity.loadedSprites.push(this.simplifiedSprite);
      }

      this.simpSpritePixels = this.simplifiedSprite.pixels;
      this.simpSpriteHeight = this.simplifiedSprite.height;
      this.simpSpriteWidth = this.simplifiedSprite.width;
      this.simpSpriteHalfWidth = Math.floor(this.simpSpriteWidth / 2);
    }

    this.detailedSprite = detailedSprite;
    if (this.detailedSprite !== null) {
      this.detailedSpriteHalfHeight = Math.floor(this.detailedSprite.height / 2);
      this.detailedSpriteDefaultScale = detailedSpriteDefaultScale;
    } else {
      this.detailedSpriteHalfHeight = 0;
      this.detailedSpriteDefaultScale = 0;
      console.warn('Detailed sprite is null,', this);
    }

    this.lastTookDamageTick = null;
    this.damageVibrationTicks = 3;
  }

  tick() {

  }

  drawPixel(imageData) {
    if (this.pixelColor === null) return;

    const x = this.pixelX();
    const y = this.pixelY();
    if (x >= 0 && x < this.world.worldSize && y >= 0 && y < this.world.worldSize) {
      const i = this.world.tileMap.coordinatesToIndex(x, y);
      imageData[i * 4] = this.pixelColor[0];
      imageData[i * 4 + 1] = this.pixelColor[1];
      imageData[i * 4 + 2] = this.pixelColor[2];
      imageData[i * 4 + 3] = 255;
    }
  }

  pixelX() {
    return Math.round(this.x);
  }

  pixelY() {
    return Math.round(this.y);
  }

  drawSimplified(imageData) {
    if (this.simplifiedSprite === null) return;

    for (let dx = 0; dx < this.simpSpriteWidth; dx++) {
      for (let dy = 0; dy < this.simpSpriteHeight; dy++) {
        const x = this.x + dx - this.simpSpriteHalfWidth;
        const y = this.y + dy - this.simpSpriteHeight;

        if (x < 0 || x >= this.world.tileMap.worldSize || y < 0 || y >= this.world.tileMap.worldSize) continue;

        const myIndex = dy * this.simpSpriteWidth + dx;
        const worldIndex = this.world.tileMap.coordinatesToIndex(x, y);

        if (this.simpSpritePixels[myIndex * 4 + 3] === 0) continue;

        imageData[worldIndex * 4] = this.simpSpritePixels[myIndex * 4];
        imageData[worldIndex * 4 + 1] = this.simpSpritePixels[myIndex * 4 + 1];
        imageData[worldIndex * 4 + 2] = this.simpSpritePixels[myIndex * 4 + 2];
        imageData[worldIndex * 4 + 3] = this.simpSpritePixels[myIndex * 4 + 3];
      }
    }
  }

  drawDetailed(worldImageSize) {
    if (this.detailedSprite === null) return;

    if (this.world.eventScheduler.ticks - this.lastTookDamageTick <= this.damageVibrationTicks) this.vibrate(0.1);

    this.world.p5.fill(0, 0, 0, 100);
    const scale = worldImageSize / this.world.worldSize;
    const x = (this.x + this.xOffset) * scale - worldImageSize / 2;
    const y = (this.y + this.yOffset - this.detailedSpriteHalfHeight * this.detailedSpriteDefaultScale) * scale - worldImageSize / 2;
    const w = this.detailedSprite.width * scale * this.detailedSpriteDefaultScale;
    const h = this.detailedSprite.height * scale * this.detailedSpriteDefaultScale;
    this.world.p5.ellipse(x, this.y * scale - worldImageSize / 2, w * 0.8, w * 0.4);
    this.world.p5.image(this.detailedSprite, x, y, w, h);
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  takeDamage(amount, damager) {
    this.health = Math.max(this.health - amount, 0);
    if (this.health === 0) {
      this.onDeath(damager);
      this.dead = true;
    }

    this.lastTookDamageTick = this.world.eventScheduler.ticks;
  }

  vibrate(amount) {
    this.xOffset = Math.randRange(-amount, amount);
    this.yOffset = Math.randRange(-amount, amount);
  }

  onDeath(killer) {
  }
}

export class StaticEntity extends Entity {
  constructor(world, x, y, size, pixelColor, health, simplifiedSprite, detailedSprite, detailedSpriteDefaultScale) {
    super(world, x, y, size, pixelColor, health, simplifiedSprite, detailedSprite, detailedSpriteDefaultScale);
  }
}

export class EntityTree extends StaticEntity {
  constructor(world, x, y, treeSprite, treeSpriteDetailed) {
    super(world, x, y, 5, null, 250, treeSprite, treeSpriteDetailed, 0.25);
  }

  onDeath(killer) {
    if (!killer) return;
    if (killer instanceof EntityHuman) killer.inventory.addItem(ITEMS.wood, Math.round(Math.randRange(5, 20)));
  }
}

export class LivingEntity extends Entity {
  constructor(world, x, y, pixelColor, health, directionalSprites, detailedSpriteDefaultScale, speed, damage, attackTicks) {
    super(world, x, y, 1, pixelColor, health, null, directionalSprites.down, detailedSpriteDefaultScale);
    this.directionalSprites = directionalSprites;
    this.speed = speed;
    this.damage = damage;
    this.attackTicks = attackTicks;
    this.ai = null;

    this.moveTowardsX = null;
    this.moveTowardsY = null;

    this.lastAttackTick = null;
  }

  setMoveTowards(x, y) {
    if (this.moveTowardsX === x && this.moveTowardsY === y) return;

    this.moveTowardsX = x;
    this.moveTowardsY = y;

    const dx = this.moveTowardsX - this.x;
    const dy = this.moveTowardsY - this.y;
    const dtSpeed = this.speed * this.world.p5.deltaTime * 0.001;

    if (!this.hasNoMoveTowards()) {
      if (Math.sign(dx) > 0 && Math.abs(dx) > dtSpeed) this.detailedSprite = this.directionalSprites.right;
      else if (Math.sign(dx) < 0 && Math.abs(dx) > dtSpeed) this.detailedSprite = this.directionalSprites.left;
      else if (Math.sign(dy) < 0 && Math.abs(dy) > dtSpeed) this.detailedSprite = this.directionalSprites.up;
      else if (Math.sign(dy) > 0 && Math.abs(dy) > dtSpeed) this.detailedSprite = this.directionalSprites.down;
    }
  }

  hasNoMoveTowards() {
    return this.moveTowardsX === null || this.moveTowardsY === null;
  }

  moveDirectlyTowards() {
    if (this.hasNoMoveTowards()) return;

    const dx = this.moveTowardsX - this.x;
    const dy = this.moveTowardsY - this.y;
    const dtSpeed = this.speed * this.world.p5.deltaTime * 0.001;

    if (Math.abs(dx) < dtSpeed && Math.abs(dy) < dtSpeed) {
      this.setPosition(this.moveTowardsX, this.moveTowardsY);
      this.setMoveTowards(null, null);
      return;
    }

    if (Math.abs(dy) < dtSpeed) this.yOffset = Math.abs(0.5 - Math.abs(dx)) - 0.5;
    else if (Math.abs(dx) < dtSpeed) this.yOffset = Math.abs(0.5 - Math.abs(dy)) - 0.5;
    else this.yOffset = 0;

    const newX = this.x + Math.sign(dx) * dtSpeed;
    const newY = this.y + Math.sign(dy) * dtSpeed;
    this.setPosition(newX, newY);
  }

  setAI(ai) {
    let targetX = null, targetY = null;
    if (this.ai !== null) {
      targetX = this.ai.targetX;
      targetY = this.ai.targetY;
    }
    this.ai = ai;
    this.ai.setTarget(targetX, targetY);
  }

  attack(entity) {
    if (this.lastAttackTick === null || this.world.eventScheduler.ticks - this.lastAttackTick >= this.attackTicks) {
      this.lastAttackTick = this.world.eventScheduler.ticks;
      entity.takeDamage(this.damage, this);
    }
  }
}

export class EntityHuman extends LivingEntity {
  constructor(world, x, y) {
    super(world, x, y, [255, 100, 100], 100, assets.humanoids.crimson, 0.2, Math.randRange(2, 3), Math.randRange(10, 20), Math.randRange(10, 20));
    this.setAI(new HumanIdleAI(this));

    this.inventory = new Inventory();
    this.hunger = 0;

    this.noAvaliableTrees = null;

    /**
     * @type {Kingdom}
     */
    this.kingdom = null
  }

  tick() {

  }
}
