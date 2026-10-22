export type CreatureRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythical';
export type BiomeName = 'Surface Waters' | 'Sunlit Shallows' | 'Twilight Reef' | 'Midnight Trench' | 'Abyssal Depths';
export type CreatureBehavior = 'schooling' | 'wander' | 'curious' | 'flee' | 'lurker' | 'slow_drift' | 'patrol';

export interface SpeciesDefinition {
  id: string;
  name: string;
  scientificName: string;
  rarity: CreatureRarity;
  primaryBiome: BiomeName;
  depthRange: [number, number]; // [minDepth, maxDepth]
  worldXRange: [number, number]; // [minX, maxX]
  behavior: CreatureBehavior;
  baseSpeed: number;
  scale: number;
  texturePath: string;
  textureLeftPath?: string;
  textureRightPath?: string;
  isAnimated?: boolean;
  frames?: string[];
  animationSpeed?: number;
  description: string;
  fieldNotes: string;
  discoveryHint: string;
}

export const SPECIES_CATALOG: SpeciesDefinition[] = [
  // --- SURFACE WATERS (0 - 25m) ---
  {
    id: 'azure_tang',
    name: 'Azure Tang',
    scientificName: 'Paracanthurus hepatus',
    rarity: 'Common',
    primaryBiome: 'Surface Waters',
    depthRange: [0, 25],
    worldXRange: [-60, 60],
    behavior: 'schooling',
    baseSpeed: 3.2,
    scale: 0.95,
    texturePath: '/assets/silhouettes/tang.svg',
    description: 'A sleek, laterally compressed surgeonfish silhouette with fine dorsal rays. Forms agile schools that weave through upper sunlit waters.',
    fieldNotes: 'Frequently glides near surface swells, presenting a sharp hydrodynamic profile against ocean currents.',
    discoveryHint: 'Common in shallow water near surface currents.'
  },
  {
    id: 'bluefin_tuna',
    name: 'Atlantic Bluefin Tuna',
    scientificName: 'Thunnus thynnus',
    rarity: 'Common',
    primaryBiome: 'Surface Waters',
    depthRange: [2, 28],
    worldXRange: [-55, 55],
    behavior: 'schooling',
    baseSpeed: 4.8,
    scale: 1.45,
    texturePath: '/assets/silhouettes/tuna.svg',
    description: 'A hydrodynamic pelagic powerhouse with sickle-shaped finlets. Slices horizontally across the water column in coordinated hunting runs.',
    fieldNotes: 'Swims in continuous forward motion to pass oxygen over gills. Unmistakable streamlined silhouette.',
    discoveryHint: 'High-speed pelagic cruiser near surface open currents.'
  },
  {
    id: 'green_sea_turtle',
    name: 'Green Sea Turtle',
    scientificName: 'Chelonia mydas',
    rarity: 'Uncommon',
    primaryBiome: 'Surface Waters',
    depthRange: [0, 30],
    worldXRange: [-50, 50],
    behavior: 'slow_drift',
    baseSpeed: 2.2,
    scale: 1.35,
    texturePath: '/assets/silhouettes/sea-turtle.svg',
    description: 'An ancient marine reptile with broad paddle flippers and an aerodynamic carapace silhouette. Breaches at the surface for air before descending.',
    fieldNotes: 'Glides with effortless, deliberate strokes. Completely unbothered by observing divers.',
    discoveryHint: 'Glides serenely between the surface waterline and upper reef.'
  },
  {
    id: 'freshwater_angelfish',
    name: 'Silver Scalare Angelfish',
    scientificName: 'Pterophyllum scalare',
    rarity: 'Uncommon',
    primaryBiome: 'Surface Waters',
    depthRange: [4, 25],
    worldXRange: [-45, 45],
    behavior: 'wander',
    baseSpeed: 2.3,
    scale: 1.05,
    texturePath: '/assets/silhouettes/angelfish.svg',
    description: 'Laterally compressed disc silhouette with tall, flowing dorsal and anal streamers.',
    fieldNotes: 'Hovers nearly stationary among vertical kelp fronds, tilting gracefully with the swell.',
    discoveryHint: 'Drifts among tall kelp fronds in calm shallow waters.'
  },

  // --- SUNLIT SHALLOWS (25 - 90m) ---
  {
    id: 'coral_clownfish',
    name: 'Ocellaris Clownfish',
    scientificName: 'Amphiprion ocellaris',
    rarity: 'Common',
    primaryBiome: 'Sunlit Shallows',
    depthRange: [25, 80],
    worldXRange: [-55, 55],
    behavior: 'curious',
    baseSpeed: 2.6,
    scale: 0.90,
    texturePath: '/assets/silhouettes/clownfish.svg',
    description: 'A charismatic reef dweller with rounded fin profiles and subtle translucent banding. Shares the silhouette of your loyal companion.',
    fieldNotes: 'Curious by nature, frequently darting toward diver headlamps before retreating to rock crevices.',
    discoveryHint: 'Explores rock shelves and sheltered shallows.'
  },
  {
    id: 'mandarinfish',
    name: 'Psychedelic Mandarinfish',
    scientificName: 'Synchiropus splendidus',
    rarity: 'Uncommon',
    primaryBiome: 'Sunlit Shallows',
    depthRange: [28, 85],
    worldXRange: [-60, 60],
    behavior: 'wander',
    baseSpeed: 2.1,
    scale: 0.85,
    texturePath: '/assets/silhouettes/mandarinfish.svg',
    description: 'A benthic dragonet silhouette with prominent rounded pectoral fins and ornamental crest.',
    fieldNotes: 'Hugs rock contours closely, foraging along the sediment with fluid fluttering motions.',
    discoveryHint: 'Prowls coral rubble and sheltered alcoves in the mid-shallows.'
  },
  {
    id: 'pygmy_seahorse',
    name: 'Pacific Pygmy Seahorse',
    scientificName: 'Hippocampus bargibanti',
    rarity: 'Rare',
    primaryBiome: 'Sunlit Shallows',
    depthRange: [35, 90],
    worldXRange: [-50, 50],
    behavior: 'slow_drift',
    baseSpeed: 1.4,
    scale: 0.82,
    texturePath: '/assets/silhouettes/seahorse.svg',
    description: 'Slender vertical silhouette with a tightly curled prehensile tail and coronet crown.',
    fieldNotes: 'Anchors to seafloor gorgonian fans, maintaining stillness to dissolve into the shadows.',
    discoveryHint: 'Anchored to seafloor rock formations and sea fans.'
  },
  {
    id: 'mottled_flounder',
    name: 'Peacock Flounder',
    scientificName: 'Bothus lunatus',
    rarity: 'Common',
    primaryBiome: 'Sunlit Shallows',
    depthRange: [40, 90],
    worldXRange: [-55, 55],
    behavior: 'wander',
    baseSpeed: 2.2,
    scale: 1.05,
    texturePath: '/assets/silhouettes/flounder.svg',
    description: 'Flat oval benthic silhouette with twin raised dorsal eyes. Skims directly along the seabed floor.',
    fieldNotes: 'Settles into floor sediment when approached, virtually invisible except for its dark profile when in motion.',
    discoveryHint: 'Glides right along the sandy bottom floor of the shallows.'
  },

  // --- TWILIGHT REEF (90 - 215m) ---
  {
    id: 'red_lionfish',
    name: 'Red Lionfish',
    scientificName: 'Pterois volitans',
    rarity: 'Uncommon',
    primaryBiome: 'Twilight Reef',
    depthRange: [90, 180],
    worldXRange: [-55, 55],
    behavior: 'wander',
    baseSpeed: 2.4,
    scale: 1.15,
    texturePath: '/assets/silhouettes/lionfish.svg',
    description: 'A striking predatory silhouette boasting ornate fan-like pectoral fins and tall venomous dorsal spines.',
    fieldNotes: 'Stalks with deliberate slowness, cornering prey against limestone cave walls with flared pectoral fans.',
    discoveryHint: 'Patrols limestone archways and cave entrances in the twilight zone.'
  },
  {
    id: 'giant_moray',
    name: 'Giant Moray Eel',
    scientificName: 'Gymnothorax javanicus',
    rarity: 'Rare',
    primaryBiome: 'Twilight Reef',
    depthRange: [95, 205],
    worldXRange: [-60, 60],
    behavior: 'lurker',
    baseSpeed: 2.7,
    scale: 1.4,
    texturePath: '/assets/silhouettes/moray.svg',
    description: 'An elongated, sinuous serpentine predator silhouette with an agape jaw profile.',
    fieldNotes: 'Weaves through dark cavern fissures, rhythmically expanding its throat to breathe in the gloom.',
    discoveryHint: 'Lurks within deep fissures and underwater cavern mouths.'
  },
  {
    id: 'broadbill_swordfish',
    name: 'Broadbill Swordfish',
    scientificName: 'Xiphias gladius',
    rarity: 'Rare',
    primaryBiome: 'Twilight Reef',
    depthRange: [100, 215],
    worldXRange: [-55, 55],
    behavior: 'patrol',
    baseSpeed: 4.6,
    scale: 1.55,
    texturePath: '/assets/silhouettes/swordfish.svg',
    description: 'Needle-nosed pelagic hunter silhouette featuring a long rostrum sword and towering dorsal fin.',
    fieldNotes: 'Slices horizontally through deep currents with effortless, missile-like acceleration.',
    discoveryHint: 'High-speed cruiser slicing horizontally across the twilight drop-off.'
  },
  {
    id: 'pelagic_manta_ray',
    name: 'Giant Oceanic Manta Ray',
    scientificName: 'Mobula birostris',
    rarity: 'Epic',
    primaryBiome: 'Twilight Reef',
    depthRange: [95, 220],
    worldXRange: [-50, 50],
    behavior: 'slow_drift',
    baseSpeed: 2.2,
    scale: 1.95,
    texturePath: '/assets/silhouettes/manta-ray.svg',
    description: 'Expansive winged silhouette spanning several meters across, with cephalic horn fins and whip tail.',
    fieldNotes: 'Glides through the water column with slow, hypnotic wing beats, undisturbed by divers.',
    discoveryHint: 'Glides gracefully through the twilight thermocline.'
  },
  {
    id: 'luminescent_medusa',
    name: 'Moonlit Medusa',
    scientificName: 'Aequorea victoria',
    rarity: 'Rare',
    primaryBiome: 'Twilight Reef',
    depthRange: [95, 230],
    worldXRange: [-55, 55],
    behavior: 'slow_drift',
    baseSpeed: 1.4,
    scale: 1.35,
    texturePath: '/assets/silhouettes/medusa.svg',
    description: 'A translucent bell silhouette with trailing tentacles and soft bioluminescent inner node highlights.',
    fieldNotes: 'Pulsates vertically in deep shadows with hypnotic, buoyant grace.',
    discoveryHint: 'Glows softly in the deep twilight and upper trench currents.'
  },

  // --- MIDNIGHT TRENCH (215 - 325m) ---
  {
    id: 'hammerhead_shark',
    name: 'Scalloped Hammerhead Shark',
    scientificName: 'Sphyrna lewini',
    rarity: 'Epic',
    primaryBiome: 'Midnight Trench',
    depthRange: [215, 315],
    worldXRange: [-55, 55],
    behavior: 'patrol',
    baseSpeed: 3.6,
    scale: 1.7,
    texturePath: '/assets/silhouettes/reef-shark.svg',
    description: 'An iconic apex predator silhouette with distinctive dorsal fin and lateral pectoral wings.',
    fieldNotes: 'Patrols trench ledges with fluid lateral sweeps, tracking electrical impulses through dark waters.',
    discoveryHint: 'Patrols the cold depths of the Midnight Trench.'
  },
  {
    id: 'great_white_shark',
    name: 'Apex Great White Shark',
    scientificName: 'Carcharodon carcharias',
    rarity: 'Legendary',
    primaryBiome: 'Midnight Trench',
    depthRange: [225, 325],
    worldXRange: [-55, 55],
    behavior: 'patrol',
    baseSpeed: 4.2,
    scale: 1.95,
    texturePath: '/assets/silhouettes/reef-shark.svg',
    description: 'A massive, muscular apex predator silhouette that cuts silently through the oceanic abyss.',
    fieldNotes: 'Looms menacingly out of the inky gloom before turning with explosive, predatory speed.',
    discoveryHint: 'Lurks in the dark depths of the oceanic rift. Keep dive torches ready.'
  },
  {
    id: 'ocean_sunfish',
    name: 'Pelagic Ocean Sunfish',
    scientificName: 'Mola mola',
    rarity: 'Rare',
    primaryBiome: 'Midnight Trench',
    depthRange: [220, 320],
    worldXRange: [-50, 50],
    behavior: 'slow_drift',
    baseSpeed: 1.8,
    scale: 1.75,
    texturePath: '/assets/silhouettes/sunfish.svg',
    description: 'A colossal, flattened disc silhouette with tall opposing dorsal and anal rudder fins.',
    fieldNotes: 'Floats placidly through pitch darkness like a submerged stone monolith.',
    discoveryHint: 'Drifts like a submerged stone monolith in the deep trench.'
  },
  {
    id: 'abyssal_anglerfish',
    name: 'Humpback Anglerfish',
    scientificName: 'Melanocetus johnsonii',
    rarity: 'Epic',
    primaryBiome: 'Midnight Trench',
    depthRange: [220, 310],
    worldXRange: [-50, 50],
    behavior: 'lurker',
    baseSpeed: 1.9,
    scale: 1.4,
    texturePath: '/assets/silhouettes/anglerfish.svg',
    description: 'The terrifying monarch of the abyss. Heavy rounded silhouette armed with needle-sharp recurved fangs and a suspended bioluminescent lure.',
    fieldNotes: 'Suspends its glowing photophore lure motionless in total darkness to attract prey into striking range.',
    discoveryHint: 'Follow the eerie glowing orb suspended in the pitch-black trench.'
  },

  // --- ABYSSAL DEPTHS (325 - 400m+) ---
  {
    id: 'abyssal_pufferfish',
    name: 'Abyssal Porcupine Puffer',
    scientificName: 'Diodon hystrix',
    rarity: 'Epic',
    primaryBiome: 'Abyssal Depths',
    depthRange: [325, 395],
    worldXRange: [-50, 50],
    behavior: 'wander',
    baseSpeed: 2.1,
    scale: 1.25,
    texturePath: '/assets/silhouettes/pufferfish.svg',
    description: 'A heavy globose silhouette armored with defensive spines, resilient against extreme crushing hydrostatic pressure.',
    fieldNotes: 'Drifts along the abyssal seabed, unfazed by near-freezing temperatures and immense depth.',
    discoveryHint: 'Drifts along the crushing sediment floor of the deepest abyss.'
  },
  {
    id: 'ancient_leviathan',
    name: 'Ancient Oceanic Leviathan',
    scientificName: 'Balaenoptera titanis',
    rarity: 'Mythical',
    primaryBiome: 'Abyssal Depths',
    depthRange: [330, 400],
    worldXRange: [-40, 40],
    behavior: 'slow_drift',
    baseSpeed: 1.6,
    scale: 3.2,
    texturePath: '/assets/silhouettes/humpback-whale.svg',
    description: 'A colossal prehistoric cetacean silhouette whose deep subsonic acoustic pulses vibrate through the bedrock of the entire oceanic labyrinth.',
    fieldNotes: 'Commands absolute awe. Glides silently through the deepest hadal trenches like an underwater god.',
    discoveryHint: 'The legendary ruler of the seafloor; wanders the lowest depths of the Hadal abyss.'
  }
];

export function getSpeciesById(id: string): SpeciesDefinition | undefined {
  return SPECIES_CATALOG.find(s => s.id === id);
}

export function getSpeciesByBiome(biome: BiomeName): SpeciesDefinition[] {
  return SPECIES_CATALOG.filter(s => s.primaryBiome === biome);
}

export function getRarityColor(rarity: CreatureRarity): string {
  switch (rarity) {
    case 'Common': return '#94a3b8'; // Slate 400
    case 'Uncommon': return '#38bdf8'; // Sky 400
    case 'Rare': return '#a855f7'; // Purple 500
    case 'Epic': return '#f59e0b'; // Amber 500
    case 'Legendary': return '#ef4444'; // Red 500
    case 'Mythical': return '#10b981'; // Emerald 500 / Iridescent
  }
}
