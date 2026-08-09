'use strict';

// ---------------------------------------------------------------------------
// Deterministic pseudo-random generator (seeded) so the catalog stays stable
// across restarts even though it is generated on the fly (no database on the
// free plan – see AGENTS.md).
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260809);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const float1 = (min, max) => Math.round((rand() * (max - min) + min) * 10) / 10;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { id: 'schreibgeraete', label: 'Kugelschreiber & Schreibgeräte', image: 'assets/cat-schreibgeraete.jpg' },
  { id: 'tassen', label: 'Tassen & Trinkbecher', image: 'assets/cat-tassen.jpg' },
  { id: 'textilien', label: 'Textilien', image: 'assets/cat-textilien.jpg' },
  { id: 'taschen', label: 'Taschen & Rucksäcke', image: 'assets/cat-taschen.jpg' },
  { id: 'technik', label: 'USB-Sticks & Tech-Gadgets', image: 'assets/cat-technik.jpg' },
  { id: 'trinkflaschen', label: 'Trinkflaschen', image: 'assets/cat-trinkflaschen.jpg' },
  { id: 'schirme', label: 'Regenschirme', image: 'assets/cat-schirme.jpg' },
  { id: 'papier', label: 'Notizbücher & Papierwaren', image: 'assets/cat-papier.jpg' },
];

const NAME_TEMPLATES = {
  schreibgeraete: ['Kugelschreiber Slim', 'Kugelschreiber Grip', 'Druckkugelschreiber Eco', 'Metall-Kugelschreiber Twist', 'Kugelschreiber Recycled'],
  tassen: ['Kaffeetasse Classic', 'Doppelwandiger Trinkbecher', 'Keramiktasse Colour-Rim', 'Porzellantasse Premium', 'To-Go-Becher Thermo'],
  textilien: ['Poloshirt Piqué', 'T-Shirt Organic Cotton', 'Softshelljacke', 'Sweatshirt Unisex', 'Funktionsshirt Sport'],
  taschen: ['Baumwolltasche Fairtrade', 'Rucksack Business', 'Kühltasche Picknick', 'Umhängetasche Canvas', 'Laptoptasche 15\"'],
  technik: ['USB-Stick 32GB', 'Powerbank 5000mAh', 'Kabelloses Ladepad', 'Bluetooth-Lautsprecher Mini', 'USB-Stick Wood Edition'],
  trinkflaschen: ['Trinkflasche Edelstahl 0,5l', 'Sportflasche BPA-frei', 'Thermosflasche Isoliert', 'Glasflasche mit Bambusdeckel', 'Trinkflasche Recycled PET'],
  schirme: ['Taschenschirm Automatik', 'Golfschirm XXL', 'Sturmschirm Windproof', 'Knirps-Schirm Mini', 'Stockschirm Holzgriff'],
  papier: ['Notizbuch A5 Hardcover', 'Notizblock Recyclingpapier', 'Tischkalender Premium', 'Klebezettel-Set', 'Terminplaner A6'],
};

const DESCRIPTIONS = {
  schreibgeraete: 'Zuverlässiges Schreibgerät für den täglichen Einsatz, individuell gravierbar oder bedruckbar mit Logo.',
  tassen: 'Robuste Tasse für Büro und Zuhause, spülmaschinenfest, ideal für Logo-Druck oder Gravur.',
  textilien: 'Hochwertiges Kleidungsstück aus pflegeleichtem Material, bestickbar oder bedruckbar mit Firmenlogo.',
  taschen: 'Praktische Tasche für Alltag und Reise, strapazierfähig und großflächig bedruckbar.',
  technik: 'Nützliches Tech-Gadget mit Wiedererkennungswert, individuell gravierbar oder bedruckbar.',
  trinkflaschen: 'Auslaufsichere Flasche für unterwegs, langlebig und werbewirksam bedruckbar.',
  schirme: 'Wetterfester Schirm mit großer Bedruckfläche – klassischer Streuartikel mit hoher Sichtbarkeit.',
  papier: 'Praktisches Papierprodukt für den Büroalltag, individuell gestaltbar mit Logo und Farbwahl.',
};

const TAGS = {
  schreibgeraete: ['stift', 'kuli', 'kugelschreiber', 'schreibgeraet', 'buero', 'pen'],
  tassen: ['tasse', 'becher', 'kaffee', 'mug', 'trinkbecher'],
  textilien: ['shirt', 'textil', 'kleidung', 'mode', 'bekleidung'],
  taschen: ['tasche', 'rucksack', 'bag', 'beutel', 'reise'],
  technik: ['usb', 'stick', 'gadget', 'elektronik', 'tech', 'strom'],
  trinkflaschen: ['flasche', 'trinken', 'bottle', 'sport'],
  schirme: ['schirm', 'regen', 'umbrella', 'wetter'],
  papier: ['papier', 'notiz', 'kalender', 'buero', 'heft'],
};

// ---------------------------------------------------------------------------
// Manufacturers – the 50 largest / best known German promotional-product
// suppliers and distributors (sample catalog, see chat note on data source).
// ---------------------------------------------------------------------------
const MANUFACTURER_NAMES = [
  'PF Concept Deutschland', 'Midocean Deutschland', 'Inspirion GmbH', 'XD Connects Germany',
  'Elasto Form KG', 'Nestler GmbH', 'Ritter-Pen GmbH', 'Klio-Eterna Schreibgeräte',
  'Uma Schreibgeräte', 'Senator GmbH', 'Stilolinea Deutschland', 'Kalfany Süße Werbung',
  'Halfar System GmbH', 'Karlowsky Fashion', 'James Harvest Sportswear', 'Result Clothing Europe',
  'Myrtle Beach Textilien', 'James & Nicholson', 'Toppoint Deutschland', 'Elevate Essentials',
  'Mahlwerck Porzellan', 'Magnum Cups Deutschland', 'Troika Germany', 'Reflects GmbH',
  'Metmaxx Handelsgesellschaft', 'Bagobag Textilhandel', 'Faber-Castell Werbemittel', 'Ansorg GmbH',
  'Doppler Schirmfabrik', 'Fare Guenther Fassbender', 'Anda Present Deutschland', 'Giving Europe',
  'Spranz GmbH', 'LM Bags & Textiles', 'Sagaform Deutschland', 'Basic Nature',
  'Bic Graphic Europe', 'Continental Clothing Company', 'Neutral Fairtrade Textiles', 'B&C Collection Deutschland',
  'Owney Taschenmanufaktur', 'Clique Nordic Deutschland', 'Craft Sportswear Deutschland', 'Zweibrüder Optoelectronics',
  'Victorinox Deutschland', 'Deuter Sport', 'Contigo Deutschland', 'Rothirsch Werbeartikel',
  'Roka Werbemittel GmbH', 'Vivid Promotion GmbH',
];

const CITIES = ['Hamburg', 'Berlin', 'München', 'Köln', 'Frankfurt am Main', 'Stuttgart', 'Bielefeld', 'Nürnberg', 'Bremen', 'Wuppertal', 'Mainz', 'Aachen', 'Kassel', 'Bonn', 'Mannheim'];

const manufacturers = MANUFACTURER_NAMES.map((name, i) => ({
  id: 'h' + (i + 1),
  name,
  city: CITIES[i % CITIES.length],
  primaryCategory: CATEGORIES[i % CATEGORIES.length].id,
  foundedYear: 1970 + int(0, 50),
}));

// ---------------------------------------------------------------------------
// Products – each manufacturer offers items in its primary category plus one
// item in a secondary category, so every category has enough manufacturers
// to compare against each other.
// ---------------------------------------------------------------------------
const products = [];
let pid = 1;

function makeProduct(manufacturer, categoryId, templateIndex) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  const name = NAME_TEMPLATES[categoryId][templateIndex % NAME_TEMPLATES[categoryId].length];
  const stock = pick([0, 25, 80, 150, 320, 500, 750, 1200, 2500, 5000]);
  const deliveryDays = pick([1, 2, 3, 4, 5, 7, 10, 14]);
  const rating = float1(2.8, 5.0);
  const reviewCount = int(3, 480);
  const priceBase = {
    schreibgeraete: [0.35, 2.5], tassen: [1.2, 6.5], textilien: [4.5, 22],
    taschen: [1.8, 14], technik: [2.5, 18], trinkflaschen: [1.5, 12],
    schirme: [3.5, 16], papier: [0.9, 8],
  }[categoryId];
  const price = float1(priceBase[0], priceBase[1]);
  products.push({
    id: 'p' + pid++,
    manufacturerId: manufacturer.id,
    manufacturerName: manufacturer.name,
    category: categoryId,
    categoryLabel: cat.label,
    name: `${name} „${manufacturer.name.split(' ')[0]}"`,
    description: DESCRIPTIONS[categoryId],
    tags: TAGS[categoryId],
    image: cat.image,
    price,
    minOrderQty: pick([25, 50, 100, 250, 500]),
    stock,
    deliveryDays,
    rating,
    reviewCount,
  });
}

manufacturers.forEach((m, i) => {
  makeProduct(m, m.primaryCategory, i);
  const secondaryCategory = CATEGORIES[(i + 3) % CATEGORIES.length].id;
  makeProduct(m, secondaryCategory, i + 2);
});

module.exports = { categories: CATEGORIES, manufacturers, products };
