const CONSONANTS = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'];
const SINGLE_VOWELS = ['a', 'e', 'i', 'o', 'u'];
const DOUBLE_VOWELS = [
  'aa', 'ae', 'ai', 'ao', 'au', 'ay',
  'ee', 'ea', 'ei', 'eo', 'eu', 'ey',
  'ia', 'ie', 'io', 'iu', 'uy',
  'oo', 'oa', 'oe', 'oi', 'ou', 'oy',
  'ua', 'ue', 'ui', 'uo', 'uy'
];

const KINGDOM_PREFIXES_1 = ['Democratic', 'People\'s', 'Golden', 'Mystic', 'Eternal', 'Celestial'];
const KINGDOM_PREFIXES_2 = ['Kingdom of', 'Republic of', 'Empire of', 'Union of'];
const KINGDOM_PREFIXES_3 = ['Ancient', 'Holy', 'United', 'Imperial'];

const NOUNS = [
  'freedom', 'crabs', 'food', 'gold', 'independence', 'trees', 'men', 'women', 'dogs', 'cats',
  'bears', 'dirt', 'eternity', 'life', 'death', 'breakfast', 'lunch', 'dinner', 'dessert',
  'ancestors', 'descendants', 'lightning', 'clouds', 'technology', 'civilizations', 'pigs',
  'mountains', 'rivers', 'oceans', 'stars', 'dreams', 'adventures', 'legends', 'wisdom', 'knowledge',
  'souls', 'flowers', 'heroes', 'villains', 'dragons', 'magic', 'fate', 'destiny', 'treasure', 'hope',
  'nightmares', 'sunshine', 'harmony', 'chaos', 'peace', 'warriors', 'sages', 'prophets', 'secrets',
  'God', 'nature', 'universe', 'space', 'atmosphere', 'Kirk', 'Jason'
];

const VERBS = [
  'eat', 'fight', 'kill', 'defend', 'witness', 'alert', 'save', 'liberate', 'have', 'want',
  'bewitch', 'explore', 'create', 'discover', 'cherish', 'love', 'hate', 'forgive', 'forget',
  'remember', 'dream', 'imagine', 'abuse', 'wonder about', 'sacrifice', 'build', 'conquer', 'unite',
  'illuminate', 'conspire', 'corrupt', 'heal', 'guide', 'betray', 'bless', 'curse', 'vanquish', 'perish',
  'endure', 'prosper', 'crumble', 'confront', 'embrace', 'reject', 'redeem', 'surrender', 'resist'
];

const ADVERBS = [
  'softly', 'violently', 'usually', 'always', 'solemnly', 'slowly', 'quickly', 'eagerly',
  'carefully', 'bravely', 'happily', 'sadly', 'angrily', 'patiently', 'proudly', 'loudly',
  'secretly', 'freely', 'boldly', 'grimly', 'shamelessly', 'gracefully', 'recklessly', 'tirelessly'
];

const ADJECTIVES = [
  'big', 'huge', 'gigantic', 'small', 'tiny', 'many', 'countless', 'few', 'beautiful', 'ugly',
  'holy', 'unholy', 'peaceful', 'powerful', 'magical', 'mysterious', 'ancient', 'modern',
  'wise', 'foolish', 'brave', 'fierce', 'gentle', 'mighty', 'noble', 'wicked', 'kind',
  'fearless', 'glorious', 'enigmatic', 'mystical', 'radiant', 'sinister', 'majestic', 'haunting'
];

const TRANSITIONS = [
  'in the name of', 'for', 'to achieve', 'to please', 'in honor of', 'without', 'with',
  'against', 'under', 'over', 'through', 'alongside', 'within', 'beyond', 'among',
  'across', 'along', 'amid', 'beneath', 'beside', 'between', 'beneath', 'towards', 'within'
];


function random(arr) {
  return arr[Math.floor(Math.randRange(0, arr.length))];
}

/**
 * @return {string}
 */
function generateSyllable(canDoubleConsonant) {
  let c = random(CONSONANTS);
  return c + (canDoubleConsonant && Math.random() < 0.1 ? c : '') + random(random([SINGLE_VOWELS, SINGLE_VOWELS, DOUBLE_VOWELS]));
}

/**
 * @return {string}
 */
function generatePauseSyllable() {
  return "'" + random(SINGLE_VOWELS);
}

/**
 * @return {string}
 */
export function generateName() {
  const length = Math.floor(Math.randRange(1, 5));
  let word = '';
  for (let i = 0; i < length; i++) {
    if (i === 0) word += generateSyllable(false);
    else {
      if (Math.random() < 0.2) word += generatePauseSyllable();
      else word += generateSyllable(true);
    }
  }
  if (Math.random() < 0.5) word += random(CONSONANTS);
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * @return {string}
 */
export function generateKingdomName() {
  let words = [];
  if (Math.random() < 0.1) words.push(random(KINGDOM_PREFIXES_1));
  if (Math.random() < 0.4) words.push(random(KINGDOM_PREFIXES_2));
  if (Math.random() < 0.9) words.push(random(KINGDOM_PREFIXES_3));
  words.push(generateName());
  if (Math.random() < 0.5) words.push(generateName());
  return words.join(' ');
}

export function generateMotto(recurse = false) {
  let words = ['We'];

  function sentence() {
    let words = [];
    if (Math.random() < 0.5) words.push(random(ADVERBS));
    words.push(random(VERBS));
    if (Math.random() < 0.5) words.push(random(ADJECTIVES));
    words.push(random(NOUNS));
    if (Math.random() < 0.9) {
      words.push(random([random(TRANSITIONS), 'to ' + random(VERBS)]));
      if (Math.random() < 0.5) words.push(random(ADJECTIVES));
      words.push(random(NOUNS));
    }
    return words.join(' ');
  }

  words.push(sentence());

  if (!recurse && Math.random() < 0.2) words.push('and ' + sentence());

  return words.join(' ');
}