import * as assets from './assets.js';
import { ITEMS, Inventory } from './inventory.js';
import { astar } from './astar.js';
import { GRASS_TILES } from './world.js';

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
      this.simpSpriteLength = this.simpSpritePixels.length;
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

  /**
   * @param {LivingEntity?} killer
   */
  onDeath(killer) { }
}

export class StaticEntity extends Entity {
  constructor(world, x, y, size, pixelColor, health, simplifiedSprite, detailedSprite, detailedSpriteDefaultScale) {
    super(world, x, y, size, pixelColor, health, simplifiedSprite, detailedSprite, detailedSpriteDefaultScale);
  }
}

export class EntityTree extends StaticEntity {
  constructor(world, x, y, treeSprite, treeSpriteDetailed) {
    super(world, x, y, 5, null, 300, treeSprite, treeSpriteDetailed, 0.25);
  }

  /**
   * @param {EntityHuman?} killer
   */
  onDeath(killer) {
    if (!killer) return;
    if (killer instanceof LivingEntity) killer.onKill(this);
    if (killer instanceof EntityHuman) killer.inventory.addItem(ITEMS.wood, Math.randRange(5, 20));
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
      entity.takeDamage(this.damage);
    }
  }
}

export class EntityHuman extends LivingEntity {
  constructor(world, x, y) {
    super(world, x, y, [255, 100, 100], 100, assets.humanoids.crimson, 0.2, Math.randRange(2, 3), Math.randRange(2, 10), Math.randRange(10, 20));
    this.setAI(new HumanIdleAI(this));

    this.inventory = new Inventory();
    this.hunger = 0;

    this.noAvaliableTrees = null;
  }

  tick() {

  }
}

export class AI {
  constructor(entity) {
    this.entity = entity;
    this.world = this.entity.world;
    this.targetX = null;
    this.targetY = null;

    this.pathfindResult = null;
    this._requestPathfind = false;
  }

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
    this.pathfind();
  }

  hasTarget() {
    return (this.targetX !== null && this.targetY !== null)
  }

  tick() {

  }

  getPathfindRoute(x = null, y = null) {
    return astar.search(
      this.world.pathfindingGraph,
      this.world.pathfindingGraph.grid[this.entity.pixelX()][this.entity.pixelY()],
      this.world.pathfindingGraph.grid[x === null ? this.targetX : x][y === null ? this.targetY : y],
      // { heuristic: astar.heuristics.diagonal }
    );
  }

  pathfind() {
    if (this.hasTarget()) {
      this.pathfindResult = [{ x: this.entity.pixelX(), y: this.entity.pixelY() }];
      const route = this.getPathfindRoute();
      if (route.length === 0) return false;

      route.forEach(node => {
        this.pathfindResult.push({ x: node.x, y: node.y });
      });
      return true;
    }

    return false;
  }

  frame() {
    if (this.hasTarget()) {
      const nextStep = this.#getNextStepToTarget();
      if (nextStep !== null) {
        if (this.entity.hasNoMoveTowards()) {
          this.entity.setMoveTowards(nextStep.x, nextStep.y);
        }
      } else this.setTarget(null, null);
    }
    this.entity.moveDirectlyTowards();
  }

  #getNextStepToTarget() {
    if (this.pathfindResult === null) this.pathfind();

    const pathfindLength = this.pathfindResult.length;
    if (pathfindLength <= 1) return null;

    for (let i = 0; i < pathfindLength - 1; i++) {
      if (this.pathfindResult[i].x === this.entity.pixelX() && this.pathfindResult[i].y === this.entity.pixelY()) {
        return this.pathfindResult[i + 1];
      }
    }

    this.pathfind();
    return null;
  }
}

class HumanIdleAI extends AI {
  constructor(entity) {
    super(entity);

    this.lastIdleTick = null;
    this.changePositionTicks = 100;
    this.wanderRange = 5;
  }

  tick() {
    if (this.entity.inventory.countItem(ITEMS.wood) < 10 && !this.entity.noAvaliableTrees) {
      this.entity.setAI(new HumanGatheringAI(this.entity));
      return;
    }

    if (this.lastIdleTick === null || this.world.eventScheduler.ticks - this.lastIdleTick >= this.changePositionTicks) {
      const rand = this.#getRandomWander();
      if (rand !== null) {
        this.lastIdleTick = this.world.eventScheduler.ticks;
        this.setTarget(...rand);
      }
    }
  }

  #getRandomWander() {
    const xStart = Math.clamp(this.entity.pixelX() - this.wanderRange, 0, this.world.worldSize);
    const xEnd = Math.clamp(this.entity.pixelX() + this.wanderRange, 0, this.world.worldSize);
    const yStart = Math.clamp(this.entity.pixelY() - this.wanderRange, 0, this.world.worldSize);
    const yEnd = Math.clamp(this.entity.pixelY() + this.wanderRange, 0, this.world.worldSize);

    const possibleTiles = [];
    for (let x = xStart; x <= xEnd; x++) {
      for (let y = yStart; y <= yEnd; y++) {
        if (GRASS_TILES.includes(this.world.tileMap.getAt(x, y)) && this.getPathfindRoute(x, y).length !== 0) possibleTiles.push([x, y]);
      }
    }

    if (possibleTiles.length > 0) return possibleTiles[Math.floor(Math.randRange(0, possibleTiles.length))];
    return null;
  }
}

class HumanGatheringAI extends AI {
  constructor(entity) {
    super(entity);

    this.targetTree = null;
    this.unreachableTrees = [];
  }

  tick() {
    if (this.entity.inventory.countItem(ITEMS.wood) < 10) {
      if (this.targetTree === null) {
        this.unreachableTrees = [];

        while (true) {
          this.targetTree = this.#findTargetTree();

          if (this.targetTree === null) { // No avaliable trees
            this.entity.noAvaliableTrees = true;
            this.entity.setAI(new HumanIdleAI(this.entity));
            break;
          }

          if (this.getPathfindRoute(this.targetTree.pixelX(), this.targetTree.pixelY() + 1).length === 0)
            this.unreachableTrees.push(this.targetTree);
          else {
            this.setTarget(this.targetTree.pixelX(), this.targetTree.pixelY() + 1);
            break;
          }
        }
      } else if (this.entity.pixelX() === this.targetTree.pixelX() && this.entity.pixelY() === this.targetTree.pixelY() + 1) {
        this.entity.attack(this.targetTree);
        if (this.targetTree.dead) this.targetTree = null;
      }
    } else this.entity.setAI(new HumanIdleAI(this.entity));
  }

  #findTargetTree() {
    const takenTrees = this.world.entities
      .filter(entity => entity instanceof EntityHuman && entity.ai instanceof HumanGatheringAI && entity.ai.targetTree !== null)
      .map(entity => entity.ai.targetTree);
    const avaliableTrees = this.world.entities
      .filter(entity => entity instanceof EntityTree && !takenTrees.includes(entity) && !this.unreachableTrees.includes(entity) &&
        GRASS_TILES.includes(this.world.tileMap.getAt(entity.pixelX(), entity.pixelY() + 1)));

    if (avaliableTrees.length === 0) return null;
    return avaliableTrees
      .reduce((a, b) => {
        return Math.distance(a.x, a.y, this.entity.x, this.entity.y) < Math.distance(b.x, b.y, this.entity.x, this.entity.y) ? a : b
      });
  }
}
