import {generateKingdomName, generateMotto} from "./nomenclature.js";

export class Kingdom {
  /**
   * @type {Kingdom[]}
   */
  static kingdoms = [];

  constructor(world) {
    /**
     * @type {World}
     */
    this.world = world;
    /**
     * @type {number}
     */
    this.creationTick = this.world.eventScheduler.ticks;

    /**
     * @type {string}
     */
    this.name = generateKingdomName();
    /**
     * @type {string}
     */
    this.motto = generateMotto();
    /**
     * @type {[number, number, number]}
     */
    this.color = Math.randColor();

    /**
     * @type {EntityHuman[]}
     */
    this.humans = [];

    Kingdom.kingdoms.push(this);
  }

  /**
   * @param {EntityHuman} human
   */
  addHuman(human) {
    this.humans.push(human);
    human.kingdom = this;
  }
}