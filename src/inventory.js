export const ITEM_TYPES = {
  material: 0,
  weapon: 1,
  food: 2
};

export const ITEMS = {
  wood: 'wood',
  stone: 'stone'
};

export class Inventory {
  constructor() {
    this.items = {};
    Object.keys(ITEMS).forEach(name => {
      this.items[name] = 0;
    });
  }

  addItem(item, amount = 1) {
    this.items[item] += amount;
  }

  hasItem(item) {
    return this.items[item] !== 0;
  }

  removeItem(item, amount = 1) {
    this.items[item] = Math.max(this.items[item] - amount, 0);
  }

  countItem(item) {
    return this.items[item];
  }
}
