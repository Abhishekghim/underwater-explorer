import { BiomeZone } from './types';

export interface WorldRegion {
  id: string;
  name: string;
  zone: BiomeZone;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  depthRange: string;
  description: string;
  ambientColor: string;
}

export interface CaveEntrance {
  id: string;
  name: string;
  worldPosition: { x: number; y: number };
  radius: number; // Discovery trigger radius
  zone: BiomeZone;
  depthMeters: number;
  connectsTo: string[]; // Names of connected regions or chambers
  description: string;
  isSecret?: boolean;
}

export interface NavRoute {
  id: string;
  name: string;
  category: 'primary' | 'secondary' | 'secret' | 'deep';
  waypoints: [number, number][];
}

export interface MapLandmark {
  id: string;
  name: string;
  icon: string;
  category: 'Geological' | 'Wreckage' | 'Ruins' | 'Volcanic' | 'Paleontological' | 'Surface';
  worldPosition: { x: number; y: number };
  zone: BiomeZone;
  description: string;
}

// ---------------------------------------------------------------------------
// 1. EXPANDED WORLD BOUNDS
// ---------------------------------------------------------------------------
export const EXPANDED_WORLD_BOUNDS = {
  minX: -140,
  maxX: 140,
  minY: -140,
  maxY: 14,
};

// ---------------------------------------------------------------------------
// 2. PALETTE CALIBRATION (User Specified Hex Colors)
// ---------------------------------------------------------------------------
export const MAP_PALETTE = {
  ocean: {
    skyTop: '#87ceeb',
    skyMid: '#4ba8d0',
    waterline: '#1e7fa8',
    shallow: '#0d4a68',
    mid: '#082440',
    deep: '#041428',
    midnight: '#03101e',
    trench: '#01060c',
    hadal: '#000204',
    abyss: '#000000',
  },
  underwater: {
    foam: '#4ba8d0',
    shallow: '#1e7fa8',
    turquoise: '#0d4a68',
    marine: '#082440',
    deep: '#041428',
  },
  stone: {
    blackLand: '#000000',
    midSlate: '#02050b',
    distantObsidian: '#050c18',
    highlight: '#091524',
    light: '#07101c',
    mid: '#040b15',
    slate: '#030810',
    dark: '#02050b',
    obsidian: '#000000',
    deepNavy: '#010307',
  },
  deepSea: {
    zone1: '#082440',
    zone2: '#041428',
    zone3: '#03101e',
    zone4: '#01060c',
    abyss: '#000000',
  },
  biolum: {
    cyan: '#00d4ff',
    teal: '#00ffd2',
    purple: '#b450ff',
    gold: '#ffc94a',
    magma: '#ea580c',
  },
};

// ---------------------------------------------------------------------------
// 3. REGIONAL SECTOR DEFINITIONS
// ---------------------------------------------------------------------------
export const WORLD_REGIONS: WorldRegion[] = [
  {
    id: 'surface_lagoon',
    name: 'Sunlit Surface Waters',
    zone: 'Surface Waters',
    bounds: { minX: -140, maxX: 140, minY: -5, maxY: 12 },
    depthRange: '0m - 20m',
    description: 'Sunlit surface waters where the research vessel Sea Venture is anchored with descending safety lines.',
    ambientColor: MAP_PALETTE.underwater.turquoise,
  },
  {
    id: 'western_kelp_grotto',
    name: 'Western Kelp Grotto & S-Bend',
    zone: 'Sunlit Shallows',
    bounds: { minX: -130, maxX: -40, minY: -35, maxY: -5 },
    depthRange: '20m - 90m',
    description: 'Towering giant kelp fronds sheltering juvenile marine life, weaving through a winding rock corridor.',
    ambientColor: MAP_PALETTE.underwater.marine,
  },
  {
    id: 'central_sunlit_lagoon',
    name: 'Central Lagoon & The Great Arch',
    zone: 'Sunlit Shallows',
    bounds: { minX: -40, maxX: 40, minY: -38, maxY: -5 },
    depthRange: '20m - 95m',
    description: 'An open turquoise arena split by the majestic Great Rock Arch with volumetric god rays descending from above.',
    ambientColor: MAP_PALETTE.underwater.marine,
  },
  {
    id: 'eastern_temple_ruins',
    name: 'Eastern Coral Shallows & Temple Ruins',
    zone: 'Sunlit Shallows',
    bounds: { minX: 40, maxX: 130, minY: -38, maxY: -5 },
    depthRange: '20m - 95m',
    description: 'Submerged limestone colonnades and coral platforms with multiple vertical descent fissures.',
    ambientColor: MAP_PALETTE.underwater.marine,
  },
  {
    id: 'schooner_cove',
    name: 'Western Schooner Cove',
    zone: 'Twilight Reef',
    bounds: { minX: -125, maxX: -40, minY: -72, maxY: -35 },
    depthRange: '90m - 215m',
    description: 'A shadowy subterranean cavern sheltering a sunken coastal schooner. Tangled nets trap companion Lumi here.',
    ambientColor: MAP_PALETTE.deepSea.zone2,
  },
  {
    id: 'treasure_grotto',
    name: 'Subterranean Crossroads & Hidden Treasure Grotto',
    zone: 'Twilight Reef',
    bounds: { minX: -40, maxX: 35, minY: -72, maxY: -38 },
    depthRange: '90m - 215m',
    description: 'A subterranean crossroad with a secret lower grotto concealing an ancient gilded treasure chest and gold coins.',
    ambientColor: MAP_PALETTE.deepSea.zone3,
  },
  {
    id: 'galleon_canyon',
    name: 'Galleon San Cristóbal Canyon',
    zone: 'Twilight Reef',
    bounds: { minX: 35, maxX: 125, minY: -72, maxY: -38 },
    depthRange: '90m - 215m',
    description: 'A sheer limestone canyon where the 17th-century Spanish galleon San Cristóbal lies tilted on the slope.',
    ambientColor: MAP_PALETTE.deepSea.zone3,
  },
  {
    id: 'midnight_luminescent_cavern',
    name: 'Midnight Bioluminescent Cavern',
    zone: 'Midnight Trench',
    bounds: { minX: -125, maxX: -35, minY: -105, maxY: -72 },
    depthRange: '215m - 325m',
    description: 'Cold, dark depths illuminated only by clusters of glowing cyan sea urchins and pulsating deep-sea jellyfish.',
    ambientColor: MAP_PALETTE.deepSea.zone4,
  },
  {
    id: 'central_spire_chasm',
    name: 'Central Spire Chasm & Grand Highway',
    zone: 'Midnight Trench',
    bounds: { minX: -35, maxX: 35, minY: -105, maxY: -72 },
    depthRange: '215m - 325m',
    description: 'Grand underwater highway linking west and east, overlooked by towering monolithic basalt spires.',
    ambientColor: MAP_PALETTE.deepSea.zone4,
  },
  {
    id: 'eastern_basalt_chute',
    name: 'Eastern Basalt Chute & Trench Gate',
    zone: 'Midnight Trench',
    bounds: { minX: 35, maxX: 125, minY: -105, maxY: -72 },
    depthRange: '215m - 325m',
    description: 'Steep basalt precipice plunging into the crushing depths of the abyssal trench.',
    ambientColor: MAP_PALETTE.deepSea.zone4,
  },
  {
    id: 'vulcan_thermal_field',
    name: 'Chimneys of Vulcan (Hydrothermal Vents)',
    zone: 'Abyssal Depths',
    bounds: { minX: -125, maxX: -25, minY: -140, maxY: -105 },
    depthRange: '325m - 450m+',
    description: 'Volcanic cones emitting billowing mineral plumes and glowing with deep geothermal magma heat.',
    ambientColor: MAP_PALETTE.deepSea.abyss,
  },
  {
    id: 'leviathan_graveyard',
    name: 'Prehistoric Leviathan Graveyard',
    zone: 'Abyssal Depths',
    bounds: { minX: -25, maxX: 40, minY: -140, maxY: -105 },
    depthRange: '325m - 450m+',
    description: 'The colossal 30-meter fossilized skeleton of an apex prehistoric sea serpent resting in the abyssal sediment.',
    ambientColor: MAP_PALETTE.deepSea.abyss,
  },
  {
    id: 'abyssal_galleon_trench',
    name: 'Abyssal Galleon Graveyard & Monolith',
    zone: 'Abyssal Depths',
    bounds: { minX: 40, maxX: 130, minY: -140, maxY: -105 },
    depthRange: '325m - 450m+',
    description: 'The deepest, darkest trench where the ancient Hadopelagic Monolith and sunken wreck timbers rest forever.',
    ambientColor: MAP_PALETTE.deepSea.abyss,
  },
];

// ---------------------------------------------------------------------------
// 4. 17 CAVE ENTRANCES & PASSAGE JUNCTIONS (Authentic Labyrinth Openings)
// ---------------------------------------------------------------------------
export const CAVE_ENTRANCES_CATALOG: CaveEntrance[] = [
  {
    id: 'ent_surface_lagoon',
    name: 'Surface Entry Lagoon',
    worldPosition: { x: -18, y: -6 },
    radius: 7.5,
    zone: 'Sunlit Shallows',
    depthMeters: 22,
    connectsTo: ['Sunlit Surface Waters', 'Central Sunlit Cavern'],
    description: 'The main open lagoon opening directly beneath the research vessel anchorage.',
  },
  {
    id: 'ent_west_lagoon',
    name: 'West Lagoon Shallows',
    worldPosition: { x: -45, y: -6 },
    radius: 7.5,
    zone: 'Sunlit Shallows',
    depthMeters: 22,
    connectsTo: ['Sunlit Surface Waters', 'Western Grotto Corridor'],
    description: 'Shallow western sunlit corridor along the top reef.',
  },
  {
    id: 'ent_east_shelf',
    name: 'East Sunlit Shelf',
    worldPosition: { x: 2, y: -8 },
    radius: 7.5,
    zone: 'Sunlit Shallows',
    depthMeters: 29,
    connectsTo: ['Sunlit Surface Waters', 'Eastern Grand Chamber'],
    description: 'Sunlit shelf opening descending into the eastern cavern branch.',
  },
  {
    id: 'ent_far_east_open',
    name: 'Far-East Barrier Opening',
    worldPosition: { x: 50, y: -14 },
    radius: 6.5,
    zone: 'Sunlit Shallows',
    depthMeters: 50,
    connectsTo: ['Sunlit Surface Waters', 'Eastern Grand Chamber'],
    description: 'The outermost eastern ceiling opening beneath the surface reefs.',
  },
  {
    id: 'ent_west_upper',
    name: 'Western Grotto Corridor',
    worldPosition: { x: -58, y: -16 },
    radius: 7.5,
    zone: 'Sunlit Shallows',
    depthMeters: 58,
    connectsTo: ['West Lagoon Shallows', 'Far-West Labyrinth Cavern'],
    description: 'A winding limestone corridor descending smoothly along the western rock wall.',
  },
  {
    id: 'ent_central_cavern',
    name: 'Central Sunlit Cavern',
    worldPosition: { x: -27, y: -19 },
    radius: 8.0,
    zone: 'Sunlit Shallows',
    depthMeters: 68,
    connectsTo: ['Surface Entry Lagoon', 'Central Subterranean Crossroad'],
    description: 'A spacious illuminated cavern connecting the lagoon to the central crossroads.',
  },
  {
    id: 'ent_east_chamber',
    name: 'Eastern Grand Chamber',
    worldPosition: { x: 62, y: -28 },
    radius: 7.5,
    zone: 'Sunlit Shallows',
    depthMeters: 100,
    connectsTo: ['East Sunlit Shelf', 'Eastern Coral Canyon'],
    description: 'A cathedral-sized subterranean chamber flanked by steep limestone walls.',
  },
  {
    id: 'ent_far_west_cavern',
    name: 'Far-West Labyrinth Cavern',
    worldPosition: { x: -81, y: -59 },
    radius: 7.0,
    zone: 'Twilight Reef',
    depthMeters: 212,
    connectsTo: ['Western Grotto Corridor', 'Western Descent Grotto'],
    description: 'A deep western enclave nestled against the outer bedrock wall.',
  },
  {
    id: 'ent_mid_crossroads',
    name: 'Central Subterranean Crossroad',
    worldPosition: { x: -47, y: -60 },
    radius: 8.5,
    zone: 'Twilight Reef',
    depthMeters: 216,
    connectsTo: ['Central Sunlit Cavern', 'Central Vertical Trench'],
    description: 'A wide subterranean junction linking the western grottoes and central vertical descent.',
  },
  {
    id: 'ent_east_canyon',
    name: 'Eastern Coral Canyon',
    worldPosition: { x: 66, y: -51 },
    radius: 7.5,
    zone: 'Twilight Reef',
    depthMeters: 184,
    connectsTo: ['Eastern Grand Chamber', 'Eastern Chasm Rift'],
    description: 'A sheer undersea canyon winding into the eastern depths.',
  },
  {
    id: 'ent_west_descent',
    name: 'Western Descent Grotto',
    worldPosition: { x: -73, y: -75 },
    radius: 7.5,
    zone: 'Midnight Trench',
    depthMeters: 270,
    connectsTo: ['Far-West Labyrinth Cavern', 'Abyssal West Vault'],
    description: 'A vertical grotto dropping directly into the deep western abyssal vault.',
  },
  {
    id: 'ent_central_chasm',
    name: 'Central Vertical Trench',
    worldPosition: { x: -3, y: -67 },
    radius: 7.5,
    zone: 'Midnight Trench',
    depthMeters: 241,
    connectsTo: ['Central Subterranean Crossroad', 'Lower Highway Junction'],
    description: 'A deep chasm dropping through the heart of the labyrinth.',
  },
  {
    id: 'ent_east_descent',
    name: 'Eastern Chasm Rift',
    worldPosition: { x: 72, y: -70 },
    radius: 8.0,
    zone: 'Midnight Trench',
    depthMeters: 252,
    connectsTo: ['Eastern Coral Canyon', 'Abyssal Eastern Trench'],
    description: 'A precipitous rift descending into the eastern abyssal floor.',
  },
  {
    id: 'ent_lower_crossroads',
    name: 'Lower Highway Junction',
    worldPosition: { x: -34, y: -102 },
    radius: 7.5,
    zone: 'Midnight Trench',
    depthMeters: 367,
    connectsTo: ['Central Vertical Trench', 'Abyssal Central Basin'],
    description: 'Deep horizontal transit highway connecting lower cavern systems.',
  },
  {
    id: 'ent_deep_west_vault',
    name: 'Abyssal West Vault',
    worldPosition: { x: -62, y: -115 },
    radius: 7.5,
    zone: 'Abyssal Depths',
    depthMeters: 414,
    connectsTo: ['Western Descent Grotto'],
    description: 'A colossal submerged cavern chamber at the far western floor.',
  },
  {
    id: 'ent_abyssal_floor',
    name: 'Abyssal Central Basin',
    worldPosition: { x: 7, y: -116 },
    radius: 8.0,
    zone: 'Abyssal Depths',
    depthMeters: 417,
    connectsTo: ['Lower Highway Junction'],
    description: 'The lowest central trench basin resting just above the bedrock seabed.',
  },
  {
    id: 'ent_deep_east_trench',
    name: 'Abyssal Eastern Trench',
    worldPosition: { x: 52, y: -117 },
    radius: 8.0,
    zone: 'Abyssal Depths',
    depthMeters: 421,
    connectsTo: ['Eastern Chasm Rift'],
    description: 'The deepest eastern fissure touching the bottom trench floor.',
  },
];

// ---------------------------------------------------------------------------
// 5. NAVIGATIONAL CIRCUITS (Empty: No fake straight-line paths cutting through rock)
// ---------------------------------------------------------------------------
export const NAV_CIRCUITS: NavRoute[] = [];

// ---------------------------------------------------------------------------
// 6. MAP LANDMARKS CATALOG (Centered in Verified Open-Water Chambers)
// ---------------------------------------------------------------------------
export const MAP_LANDMARKS: MapLandmark[] = [
  {
    id: 'sea_venture',
    name: 'Research Vessel Sea Venture',
    icon: '⛵',
    category: 'Surface',
    worldPosition: { x: -18, y: 3.5 },
    zone: 'Surface Waters',
    description: 'Expedition mother ship anchored directly above the primary lagoon entrance.',
  },
  {
    id: 'sunlit_grotto',
    name: 'Central Sunlit Cavern',
    icon: '🪨',
    category: 'Geological',
    worldPosition: { x: -27, y: -19 },
    zone: 'Sunlit Shallows',
    description: 'A magnificent open chamber glowing with filtered sunlight from the surface lagoon.',
  },
  {
    id: 'coral_gate',
    name: 'Eastern Grand Chamber',
    icon: '🏛️',
    category: 'Ruins',
    worldPosition: { x: 62, y: -28 },
    zone: 'Sunlit Shallows',
    description: 'Submerged limestone hall connecting the upper shallows with the deep eastern canyon.',
  },
  {
    id: 'crossroads_hall',
    name: 'Mid-Depth Crossroads',
    icon: '🧭',
    category: 'Geological',
    worldPosition: { x: -47, y: -60 },
    zone: 'Twilight Reef',
    description: 'The grand subterranean junction linking the western cavern routes with the central chasm.',
  },
  {
    id: 'eastern_canyon',
    name: 'Eastern Coral Canyon',
    icon: '⚓',
    category: 'Wreckage',
    worldPosition: { x: 66, y: -51 },
    zone: 'Twilight Reef',
    description: 'A deep limestone canyon winding downward into the eastern trench.',
  },
  {
    id: 'abyssal_monolith',
    name: 'Abyssal Central Basin',
    icon: '🗿',
    category: 'Geological',
    worldPosition: { x: 7, y: -116 },
    zone: 'Abyssal Depths',
    description: 'The lowest central trench basin resting in the eternal abyssal stillness.',
  },
  {
    id: 'hadal_trench_chasm',
    name: 'Abyssal Eastern Trench',
    icon: '🌋',
    category: 'Volcanic',
    worldPosition: { x: 52, y: -117 },
    zone: 'Abyssal Depths',
    description: 'The deepest eastern fissure touching the absolute bedrock floor.',
  },
];

