import {EventScheduler} from './events.js';
import {EntityHuman, EntityTree, LivingEntity} from './entities.js';
import {trees} from './assets.js';
import {Graph} from './astar.js';
import {Kingdom} from "./civilization.js";

/**
 * @typedef Coordinates
 * @type {Object}
 * @property {number} x
 * @property {number} y
 */

export const CHUNK_SIZE = 20;
export const CHUNK_NUMBER = 25;

/**
 * @typedef {string} Tile
 */

export const TILES = {
  dirt: 'dirt',
  stone: 'stone',
  sand: 'sand',
  grass_forest: 'grass_forest',
  grass_plains: 'grass_plains',
  grass_savana: 'grass_savana',
  snow: 'snow',
  water: 'water'
};
export const GRASS_TILES = [TILES.grass_forest, TILES.grass_plains, TILES.grass_savana];
export const BIOME_TREE_SPRITES = {
  grass_forest: 'forest',
  grass_plains: 'plains',
  grass_savana: 'savana'
};

const COLORS = {
  dirt: [166, 104, 55],
  stone: [68, 74, 75],
  sand: [228, 196, 108],
  grass_forest: [30, 109, 31],
  grass_plains: [103, 138, 64],
  grass_savana: [153, 119, 17],
  snow: [229, 230, 230],
  water: [72, 142, 195]
};

const HEIGHTS = {
  snow: 14,
  stone: 11,
  dirt: 7,
  sand: 6
};

const options = {
  gen_trees: true,
  grow_trees: true,
  grow_grass: true
};

/**
 * @param {p5} p5
 * @param {number} x
 * @param {number} y
 */
function getHeightNoise(p5, x, y) {
  const f = 0.01;
  return Math.round(p5.noise(x * f, y * f) * 20);
}

function getGrassNoise(p5, x, y) {
  const f = 0.01;
  const o = 100000;
  const v = p5.noise(o + x * f, o + y * f);
  if (v > 0.6) return TILES.grass_savana;
  if (v > 0.4) return TILES.grass_plains;
  return TILES.grass_forest;
}

function getTreeNoise(p5, x, y) {
  const f = 0.01;
  const o = 100000;
  const v = p5.noise(o + x * f, o + y * f);
  return (1 - v) * 0.03;
}

class WorldDataArray {
  /**
   * @param {number} worldSize
   */
  constructor(worldSize) {
    /**
     * @type {number}
     */
    this.worldSize = worldSize;
    /**
     * @type {number}
     */
    this.worldSizeSq = this.worldSize * this.worldSize;
    /**
     * @type {Array}
     */
    this.data = Array(this.worldSizeSq);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @return {number}
   */
  coordinatesToIndex(x, y) {
    return Math.round(y) * this.worldSize + Math.round(x);
  }

  /**
   * @param {number} i
   * @return {Coordinates}
   */
  indexToCoordinates(i) {
    return {x: i % this.worldSize, y: Math.floor(i / this.worldSize)};
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  getAt(x, y) {
    return this.data[this.coordinatesToIndex(x, y)];
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {any} o
   */
  setAt(x, y, o) {
    this.data[this.coordinatesToIndex(x, y)] = o;
  }

  /**
   * @callback SetAllFn
   * @param {number} x
   * @param {number} y
   * @param {number} i
   * @return {any}
   */
  /**
   * @param {SetAllFn} cb
   */
  setAll(cb) {
    for (let i = 0; i < this.worldSizeSq; i++) {
      let c = this.indexToCoordinates(i);
      this.data[i] = cb(c.x, c.y, i);
    }
  }

  /**
   * @param {number} i
   * @return {[number, number][]}
   */
  getNeighbourCoordinatesAtIndex(i) {
    const c = this.indexToCoordinates(i);
    return [
      [c.x - 1, c.y],
      [c.x + 1, c.y],
      [c.x, c.y + 1],
      [c.x, c.y - 1],
      [c.x - 1, c.y - 1],
      [c.x - 1, c.y + 1],
      [c.x + 1, c.y - 1],
      [c.x + 1, c.y + 1]
    ]
  }
}

class TileDataArray extends WorldDataArray {
  /**
   * @param {number} worldSize
   */
  constructor(worldSize) {
    super(worldSize);
  }

  /**
   * @param {Tile} tile
   * @return {number}
   */
  #graphCost(tile) {
    switch (tile) {
      case TILES.stone:
      case TILES.snow:
        return 0;
      case TILES.water:
        return 10;
      default:
        return 1;
    }
  }

  /**
   * @return {Graph}
   */
  toGraph() {
    const a = [];
    for (let x = 0; x < this.worldSize; x++) {
      a.push([]);
      for (let y = 0; y < this.worldSize; y++) {
        a[x].push(this.#graphCost(this.getAt(x, y)));
      }
    }
    return new Graph(a, {diagonal: false});
  }
}

class ChunkDataArray extends WorldDataArray {
  /**
   * @param {World} world
   * @param {number} chunkNumber
   * @param {number} chunkSize
   */
  constructor(world, chunkNumber, chunkSize) {
    super(chunkNumber);
    /**
     * @type {World}
     */
    this.world = world;
    /**
     * @type {number}
     */
    this.chunkNumber = chunkNumber;
    /**
     * @type {number}
     */
    this.chunkSize = chunkSize;

    this.setAll((x, y) => new Chunk(this.world, x, y));
  }

  /**
   * @param {number} x
   * @param {number} y
   * @return {Chunk}
   */
  getChunkOfTile(x, y) {
    return this.getAt(Math.floor(x / this.chunkSize), Math.floor(y / this.chunkSize));
  }
}

class Chunk {
  /**
   * @param {World} world
   * @param {number} chunkX
   * @param {number} chunkY
   */
  constructor(world, chunkX, chunkY) {
    /**
     * @type {World}
     */
    this.world = world;

    /**
     * @type {number}
     */
    this.chunkX = chunkX;
    /**
     * @type {number}
     */
    this.chunkY = chunkY;

    /**
     * @type {Kingdom | null}
     */
    this.kingdom = null;
    this.culture = null;
  }

  chunkSize() {
    return this.world.chunks.chunkSize;
  }

  topLeftX() {
    return this.chunkX * this.chunkSize();
  }

  topLeftY() {
    return this.chunkY * this.chunkSize();
  }

  draw() {
    if (this.kingdom !== null) {
      this.world.p5.fill(...this.kingdom.color, 100);
      this.world.p5.rect(...this.world.camera.coordinatesToScreen(this.topLeftX(), this.topLeftY()), this.chunkSize() * this.world.imageRatio, this.chunkSize() * this.world.imageRatio);
    }
  }
}

export class World {
  constructor(p5, chunkNumber, chunkSize) {
    /** @type {p5} */
    this.p5 = p5;
    this.camera = null;

    this.worldSize = chunkNumber * chunkSize;
    this.worldSizeSq = this.worldSize * this.worldSize;

    this.entities = [];

    this.eventScheduler = new EventScheduler(this, 20);
    this.eventScheduler.scheduleInterval(world => {
      if (options.grow_grass) world.tickGrass();
    }, 1);
    this.eventScheduler.scheduleInterval(world => {
      if (options.grow_trees) world.tickTree();
    }, 1);
    this.eventScheduler.scheduleInterval(world => {
      world.entities.forEach(entity => {
        entity.tick();
        if (typeof entity.ai != 'undefined') entity.ai.tick();
      });
    }, 1);

    this.heightMap = new WorldDataArray(this.worldSize);
    this.heightMap.setAll((x, y, i) => getHeightNoise(p5, x, y));

    this.tileMap = new TileDataArray(this.worldSize);
    this.tileMap.setAll((x, y, i) => {
      let height = this.heightMap.data[i];
      if (height > HEIGHTS.snow) return TILES.snow;
      else if (height > HEIGHTS.stone) return TILES.stone;
      else if (height > HEIGHTS.dirt) return TILES.dirt;
      else if (height > HEIGHTS.sand) return TILES.sand;
      else return TILES.water;
    });
    this.#generateBiomes();
    if (options.gen_trees) this.#generateTrees();

    this.livingEntityIndexes = [];
    this.treeIndexes = [];

    this.image = this.p5.createImage(this.worldSize, this.worldSize);
    this.imageRatio = null;
    this.pathfindingGraph = this.tileMap.toGraph();

    this.chunks = new ChunkDataArray(this, chunkNumber, chunkSize);
  }

  update() {
    this.image.loadPixels();
    for (let i = 0; i < this.worldSizeSq; i++) {
      let color = this.#getTileColor(i);
      this.image.pixels[i * 4] = color[0];
      this.image.pixels[i * 4 + 1] = color[1];
      this.image.pixels[i * 4 + 2] = color[2];
      this.image.pixels[i * 4 + 3] = 255;
    }

    this.livingEntityIndexes = [];
    this.treeIndexes = [];

    this.entities = this.entities.filter(entity => !entity.dead);

    this.entities.forEach(entity => {
      if (this.camera.zoom <= 3) {
        entity.drawPixel(this.image.pixels);
        entity.drawSimplified(this.image.pixels);
      } else if (entity.detailedSprite === null) entity.drawPixel(this.image.pixels);

      const idx = this.tileMap.coordinatesToIndex(entity.pixelX(), entity.pixelY());
      if (entity instanceof LivingEntity) {
        this.livingEntityIndexes.push(idx);
      } else if (entity instanceof EntityTree) {
        this.treeIndexes.push(idx);
      }
    });

    this.entities.filter(entity => typeof entity.ai !== 'undefined').forEach(entity => {
      entity.ai.frame();
    });

    this.image.updatePixels();
  }

  draw(minWidthHeight) {
    this.imageRatio = minWidthHeight / this.worldSize;
    this.p5.image(this.image, -this.imageRatio / 2, -this.imageRatio / 2, minWidthHeight, minWidthHeight);
    this.#sortEntities();
    const [minX, maxX, minY, maxY] = this.camera.visibilityRange();
    this.entities.forEach(entity => {
      if (
        this.camera.zoom > 3 &&
        entity.x >= minX - entity.detailedSprite.width / 2 &&
        entity.x <= maxX + entity.detailedSprite.width / 2 &&
        entity.y >= minY - entity.detailedSprite.height &&
        entity.y <= maxY + entity.detailedSprite.height
      ) entity.drawDetailed(minWidthHeight);
    });
    this.chunks.data.forEach(chunk => chunk.draw());
  }

  spawnEntity(entity) {
    this.entities.push(entity);

    if (entity instanceof EntityHuman) {
      const chunk = this.chunks.getChunkOfTile(entity.pixelX(), entity.pixelY());
      if (chunk.kingdom === null) {
        const humans = this.entities.filter(e => e instanceof EntityHuman && e !== entity && Math.distance(e.x, e.y, entity.x, entity.y) <= CHUNK_SIZE * 2);
        if (humans.length === 0) {
          chunk.kingdom = new Kingdom(this);
          chunk.kingdom.addHuman(entity);
        } else {
          const closestHuman = humans.toSorted((a, b) => Math.distance(a.x, a.y, entity.x, entity.y) - Math.distance(b.x, b.y, entity.x, entity.y))[0];
          if (closestHuman.kingdom !== null) closestHuman.kingdom.addHuman(entity);
        }
      } else chunk.kingdom.addHuman(entity);
    }
  }

  #sortEntities() {
    this.entities.sort((a, b) => a.y - b.y);
  }

  #getTileColor(i) {
    const t = this.tileMap.data[i];
    const h = this.heightMap.data[i]
    const [r, g, b] = COLORS[t];

    const heightDiff = h - this.heightMap.data[i + this.worldSize];
    const factor = (t === TILES.water ? h / 20 : 1 - h / 20) - (heightDiff > 0 ? heightDiff * 0.15 : 0);

    return [
      Math.clamp(Math.round(r + factor * r), 0, 255),
      Math.clamp(Math.round(g + factor * g), 0, 255),
      Math.clamp(Math.round(b + factor * b), 0, 255)
    ];
  }

  #generateBiomes() {
    for (let i = 0; i < this.tileMap.worldSizeSq; i++) {
      const c = this.tileMap.indexToCoordinates(i);
      if (this.tileMap.data[i] === TILES.dirt) this.tileMap.data[i] = getGrassNoise(this.p5, c.x, c.y);
    }

    this.#grassSpreadAll();
  }

  #generateTrees() {
    const treeIndexes = [];
    for (let i = 0; i < this.tileMap.worldSizeSq; i++) {
      if (GRASS_TILES.includes(this.tileMap.data[i])) {
        const c = this.tileMap.indexToCoordinates(i);
        if (!treeIndexes.includes(this.tileMap.coordinatesToIndex(c.x, c.y - 1)) && Math.random() < getTreeNoise(this.p5, c.x, c.y)) {
          treeIndexes.push(i);
          this.#spawnTreeAt(c, i);
        }
      }
    }
  }

  #spawnTreeAt(c, i) {
    this.spawnEntity(new EntityTree(this, c.x + Math.randRange(-0.3, 0.3), c.y + Math.randRange(-0.3, 0.3), trees[BIOME_TREE_SPRITES[this.tileMap.data[i]]], trees[BIOME_TREE_SPRITES[this.tileMap.data[i]] + '_detailed']));
  }

  tickGrass() {
    for (let i = 0; i < 50; i++) {
      this.#spreadGrassAt(Math.floor(Math.random() * this.tileMap.worldSizeSq));
    }
  }

  tickTree() {
    const idx = Math.floor(Math.random() * this.tileMap.worldSizeSq);
    const c = this.tileMap.indexToCoordinates(idx);
    if (GRASS_TILES.includes(this.tileMap.data[idx]) && Math.random() < getTreeNoise(this.p5, c.x, c.y)) {
      let canSpawn = true;
      this.entities.forEach(entity => {
        if (!canSpawn) return;
        if (Math.abs(c.x - entity.x) < entity.size / 2 && Math.abs(c.y - entity.y) < entity.size / 2) canSpawn = false;
      });
      if (canSpawn) this.#spawnTreeAt(c, idx);
    }
  }

  #grassSpreadAll() {
    for (let i = 0; i < this.tileMap.worldSizeSq; i++) {
      this.#spreadGrassAt(i);
    }
  }

  #spreadGrassAt(i) {
    const currentTile = this.tileMap.data[i];
    if (!GRASS_TILES.includes(currentTile)) return;

    const neighbours = this.tileMap.getNeighbourCoordinatesAtIndex(i);
    const sameNeighbours = neighbours.filter(c => this.tileMap.getAt(...c) === currentTile).length;
    neighbours.forEach(c => {
      const [x, y] = c;
      if (
        x >= 0 && x < this.tileMap.worldSize &&
        y >= 0 && y < this.tileMap.worldSize
      ) {
        const neighbour = this.tileMap.getAt(x, y);
        if (
          neighbour !== currentTile &&
          GRASS_TILES.includes(neighbour) &&
          GRASS_TILES.includes(currentTile) &&
          Math.random() < (sameNeighbours > 3 ? 0.1 : 0.9)
        ) this.tileMap.data[i] = neighbour;
      }
    });
  }
}