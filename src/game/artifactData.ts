import { BiomeName } from './speciesData';

export type ArtifactCategory = 'Maritime Relic' | 'Scientific Equipment' | 'Sunken Treasure' | 'Abyssal Mineral';

export interface ArtifactDefinition {
  id: string;
  title: string;
  category: ArtifactCategory;
  primaryBiome: BiomeName;
  worldPosition: { x: number; y: number }; // Depth = -y
  texturePath: string;
  scale: number;
  description: string;
  lore: string;
  hint: string;
}

export interface LandmarkDefinition {
  id: string;
  name: string;
  primaryBiome: BiomeName;
  worldPosition: { x: number; y: number }; // Depth = -y
  discoveryRadius: number;
  description: string;
  historicalNote: string;
}

export const ARTIFACT_CATALOG: ArtifactDefinition[] = [
  {
    id: 'spanish_doubloon',
    title: 'Gilded Sunburst Doubloon',
    category: 'Sunken Treasure',
    primaryBiome: 'Sunlit Shallows',
    worldPosition: { x: 14, y: -52.0 },
    texturePath: '/assets/props/artifacts/coin_gold.png',
    scale: 0.9,
    description: 'An immaculate gold eight-escudo minted in the 17th century. Unblemished by saltwater, it glints in the treasure alcove like freshly minted coin.',
    lore: 'Carried aboard an ill-fated Spanish treasure fleet that ran aground during a sudden gale in 1682. Its pure gold alloy remains entirely untarnished.',
    hint: 'Gleams within the secret treasure grotto beneath the Great Central Arch.'
  },
  {
    id: 'expedition_scroll',
    title: 'Hydrographic Survey Chart',
    category: 'Scientific Equipment',
    primaryBiome: 'Sunlit Shallows',
    worldPosition: { x: -48, y: -24.0 },
    texturePath: '/assets/props/artifacts/scroll.png',
    scale: 1.0,
    description: 'A wax-treated parchment scroll preserving hand-drawn bathymetric contours and uncharted underwater caverns.',
    lore: 'Penned by the HMS Challenger expedition cartographers in 1873. Handwritten notes margin note the presence of an immense cavern dropping into utter darkness.',
    hint: 'Tucked beneath a rocky overhang in the western kelp passage.'
  },
  {
    id: 'salvage_spanner',
    title: 'Titanium Diving Spanner',
    category: 'Scientific Equipment',
    primaryBiome: 'Sunlit Shallows',
    worldPosition: { x: -16, y: -18.0 },
    texturePath: '/assets/props/artifacts/wrench.png',
    scale: 0.95,
    description: 'A heavy forged diving spanner encrusted with miniature barnacles and salt blooms.',
    lore: 'Left behind by marine engineers during the construction of an experimental underwater habitat module in the late 1960s.',
    hint: 'Resting on a rock shelf just above the descent into the Central Cavern.'
  },
  {
    id: 'sunken_cannon',
    title: 'Galleon 12-Pounder Cannon',
    category: 'Maritime Relic',
    primaryBiome: 'Twilight Reef',
    worldPosition: { x: 68, y: -58.0 },
    texturePath: '/assets/props/artifacts/cannon.png',
    scale: 1.25,
    description: 'A formidable cast-iron naval carriage gun wrapped in encrusting sea fans and tube-worm colonies.',
    lore: 'Mounted on the gun deck of a legendary merchant brig. The cannon bore has become an artificial refuge for reef crabs.',
    hint: 'Lies half-buried on the wooden timbers of the sunken galleon in the East Canyon.'
  },
  {
    id: 'cannonball_cluster',
    title: 'Coral-Encrusted Shot',
    category: 'Maritime Relic',
    primaryBiome: 'Twilight Reef',
    worldPosition: { x: 78, y: -66.0 },
    texturePath: '/assets/props/artifacts/cannonBall.png',
    scale: 0.85,
    description: 'Solid spherical iron ordnance fused together into a petrified cluster by calcifying coralline algae.',
    lore: 'Spilled from the shattered ammunition hold of the sunken galleon during its final plunge through the twilight waters.',
    hint: 'Resting in a rock fissure downcurrent from the galleon shipwreck.'
  },
  {
    id: 'submersible_cog',
    title: 'Bathysphere Pressure Gear',
    category: 'Scientific Equipment',
    primaryBiome: 'Midnight Trench',
    worldPosition: { x: -38, y: -68.0 },
    texturePath: '/assets/props/artifacts/gear.png',
    scale: 1.0,
    description: 'A heavy phosphor-bronze planetary cog with precision-cut gear teeth designed to operate under crushing hydrostatic forces.',
    lore: 'Part of the winch and hatch lock assembly from an early pioneering bathysphere descent into the Midnight Trench.',
    hint: 'Resting on a narrow rock ledge inside the entry canyon of the Midnight Trench.'
  },
  {
    id: 'naval_mine_casing',
    title: 'Relic Moored Mine Casing',
    category: 'Maritime Relic',
    primaryBiome: 'Midnight Trench',
    worldPosition: { x: 38, y: -82.0 },
    texturePath: '/assets/props/artifacts/mine.png',
    scale: 1.1,
    description: 'An inert spherical moored mine from an early global conflict, hollowed out by time and cold saltwater.',
    lore: 'Long rendered harmless by corroded detonator horns, the steel casing now serves as an anchor for deep-water bioluminescent polyps.',
    hint: 'Suspended silently along the sheer trench wall in the midnight darkness.'
  },
  {
    id: 'abyssal_diamond',
    title: 'Hydrothermal Kimberlite Crystal',
    category: 'Abyssal Mineral',
    primaryBiome: 'Abyssal Depths',
    worldPosition: { x: -22, y: -108.0 },
    texturePath: '/assets/props/artifacts/diamond.png',
    scale: 1.05,
    description: 'A brilliant octahedron crystal formed deep within the Earth mantle and carried up by ancient basalt eruptions.',
    lore: 'Emits an ethereal cerulean shimmer under direct diver illumination, refracting photons with otherworldly brilliance.',
    hint: 'Deep in the crushing dark of the abyssal floor, resting upon volcanic bedrock.'
  }
];

export const LANDMARK_CATALOG: LandmarkDefinition[] = [
  {
    id: 'sunlit_coral_arch',
    name: 'The Great Rock Arch',
    primaryBiome: 'Sunlit Shallows',
    worldPosition: { x: -4, y: -28.0 },
    discoveryRadius: 9.5,
    description: 'A majestic limestone archway sculpted by centuries of tidal surges, carpeted in golden sea fans and soft corals.',
    historicalNote: 'Known to local free-divers for centuries as a natural underwater bridge and a landmark above the sunken treasure grotto.'
  },
  {
    id: 'kelp_cathedral',
    name: 'Western Kelp Grotto',
    primaryBiome: 'Sunlit Shallows',
    worldPosition: { x: -65, y: -22.0 },
    discoveryRadius: 10.0,
    description: 'Towering stalks of giant kelp stretching upward through jagged cave openings, creating cathedral-like fluted columns of amber light.',
    historicalNote: 'A biological sanctuary sheltering hundreds of juvenile wrasse and damselfish within its dense floating canopy.'
  },
  {
    id: 'sunken_sloop_wreck',
    name: 'Galleon San Cristóbal',
    primaryBiome: 'Twilight Reef',
    worldPosition: { x: 72, y: -62.0 },
    discoveryRadius: 12.0,
    description: 'The petrified wooden timbers of an armed 17th-century merchant galleon resting upright on the sloping canyon wall.',
    historicalNote: 'Recorded in Spanish colonial archives as lost with all hands during the Great Equinoctial Gale of 1682.'
  },
  {
    id: 'thermal_vent_field',
    name: 'Chimneys of Vulcan',
    primaryBiome: 'Abyssal Depths',
    worldPosition: { x: -60, y: -125.0 },
    discoveryRadius: 11.0,
    description: 'Towering hydrothermal mineral spires discharging mineral-rich superheated fluids and glowing with geothermal magma heat.',
    historicalNote: 'The foundation of an entire chemosynthetic food web that thrives completely independent of solar energy.'
  },
  {
    id: 'leviathan_graveyard',
    name: 'Prehistoric Leviathan Graveyard',
    primaryBiome: 'Abyssal Depths',
    worldPosition: { x: -5, y: -125.0 },
    discoveryRadius: 13.0,
    description: 'The colossal 30-meter fossilized skeleton of an apex prehistoric sea monster resting in the abyssal sediment.',
    historicalNote: 'Carbon dating suggests this pelagic hypercarnivore prowled prehistoric ocean trenches over 40 million years ago.'
  },
  {
    id: 'hadopelagic_monolith',
    name: 'Hadopelagic Monolith',
    primaryBiome: 'Abyssal Depths',
    worldPosition: { x: 35, y: -130.0 },
    discoveryRadius: 11.0,
    description: 'A solitary basalt megalith standing immovable under crushing hydrostatic pressures at the floor of the abyssal trench.',
    historicalNote: 'Geological soundings suggest this crystalline formation was sheared from the oceanic crust during the breakup of Pangaea.'
  }
];

export function getArtifactById(id: string): ArtifactDefinition | undefined {
  return ARTIFACT_CATALOG.find(a => a.id === id);
}

export function getLandmarkById(id: string): LandmarkDefinition | undefined {
  return LANDMARK_CATALOG.find(l => l.id === id);
}
