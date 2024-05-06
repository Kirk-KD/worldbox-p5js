import {astar} from './astar.js';
import {GRASS_TILES} from './world.js';
import {ITEMS} from "./inventory.js";
import {EntityHuman, EntityTree} from "./entities.js";

export class AI {
  constructor(entity) {
    this.entity = entity;
    this.world = this.entity.world;
    this.targetX = null;
    this.targetY = null;

    this.pathfindResult = null;
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
      this.pathfindResult = [{x: this.entity.pixelX(), y: this.entity.pixelY()}];
      const route = this.getPathfindRoute();
      if (route.length === 0) return false;

      route.forEach(node => {
        this.pathfindResult.push({x: node.x, y: node.y});
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

export class HumanIdleAI extends AI {
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

export class HumanGatheringAI extends AI {
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
