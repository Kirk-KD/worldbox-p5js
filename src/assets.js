export let
  trees = {
    forest: null,
    plains: null,
    savana: null,
    forest_detailed: null,
    plains_detailed: null,
    savana_detailed: null
  },
  humanoids = {
    blue: {
      up: null,
      down: null,
      left: null,
      right: null
    },
    crimson: {
      up: null,
      down: null,
      left: null,
      right: null
    },
    orcish: {
      up: null,
      down: null,
      left: null,
      right: null
    },
    purple: {
      up: null,
      down: null,
      left: null,
      right: null
    },
    red: {
      up: null,
      down: null,
      left: null,
      right: null
    },
    yellow: {
      up: null,
      down: null,
      left: null,
      right: null
    }
  }

export function loadSprites(p5) {
  trees.forest = p5.loadImage('assets/entities/trees/tree_forest.png');
  trees.plains = p5.loadImage('assets/entities/trees/tree_plains.png');
  trees.savana = p5.loadImage('assets/entities/trees/tree_savana.png');
  trees.forest_detailed = p5.loadImage('assets/entities/trees/tree_forest_detailed.png');
  trees.plains_detailed = p5.loadImage('assets/entities/trees/tree_plains_detailed.png');
  trees.savana_detailed = p5.loadImage('assets/entities/trees/tree_savana_detailed.png');

  const loadHumanoid = race => {
    humanoids[race].left = p5.loadImage('assets/entities/humanoids/' + race + '/left.png');
    humanoids[race].right = p5.loadImage('assets/entities/humanoids/' + race + '/right.png');
    humanoids[race].up = p5.loadImage('assets/entities/humanoids/' + race + '/up.png');
    humanoids[race].down = p5.loadImage('assets/entities/humanoids/' + race + '/down.png');
  }
  loadHumanoid('blue');
  loadHumanoid('crimson');
  loadHumanoid('orcish');
  loadHumanoid('purple');
  loadHumanoid('red');
  loadHumanoid('yellow');
}
