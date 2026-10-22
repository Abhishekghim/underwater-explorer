import { SPECIES_CATALOG, SpeciesDefinition, getSpeciesById } from './speciesData';
import { ARTIFACT_CATALOG, ArtifactDefinition, getArtifactById, LANDMARK_CATALOG, LandmarkDefinition, getLandmarkById } from './artifactData';

export interface SavePayloadV1 {
  version: 1;
  timestamp: number;
  discoveredSpecies: string[];
  discoveredLandmarks: string[];
  discoveredArtifacts: string[];
  visitedBiomes: string[];
  discoveredEntrances?: string[];
  exploredSectors?: string[];
  companionRescued: boolean;
  totalDistanceSwum: number;
  maxDepthReached: number;
}

export interface DiscoveryEvent {
  type: 'species' | 'artifact' | 'landmark' | 'biome' | 'entrance';
  title: string;
  subtitle: string;
  description: string;
  iconPath?: string;
  rarity?: string;
}

export type DiscoveryListener = (event: DiscoveryEvent) => void;
export type ChangeListener = () => void;

const STORAGE_KEY = 'underwater_explorer_save_v1';

class JournalManager {
  private static instance: JournalManager;

  private discoveredSpecies: Set<string> = new Set();
  private discoveredLandmarks: Set<string> = new Set();
  private discoveredArtifacts: Set<string> = new Set();
  private visitedBiomes: Set<string> = new Set();
  private discoveredEntrances: Set<string> = new Set();
  private exploredSectors: Set<string> = new Set();
  private companionRescued: boolean = false;
  private totalDistanceSwum: number = 0;
  private maxDepthReached: number = 0;

  private listeners: Set<ChangeListener> = new Set();
  private discoveryListeners: Set<DiscoveryListener> = new Set();
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): JournalManager {
    if (!JournalManager.instance) {
      JournalManager.instance = new JournalManager();
    }
    return JournalManager.instance;
  }

  public subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onDiscovery(listener: DiscoveryListener): () => void {
    this.discoveryListeners.add(listener);
    return () => this.discoveryListeners.delete(listener);
  }

  private notifyChange() {
    this.listeners.forEach(fn => {
      try { fn(); } catch (err) { console.error('Error in journal change listener:', err); }
    });
    this.scheduleSave();
  }

  private notifyDiscovery(event: DiscoveryEvent) {
    this.discoveryListeners.forEach(fn => {
      try { fn(event); } catch (err) { console.error('Error in journal discovery listener:', err); }
    });
  }

  public recordSpecies(speciesId: string): boolean {
    if (this.discoveredSpecies.has(speciesId)) return false;
    const def = getSpeciesById(speciesId);
    if (!def) return false;

    this.discoveredSpecies.add(speciesId);
    this.notifyDiscovery({
      type: 'species',
      title: def.name,
      subtitle: `${def.rarity} • ${def.primaryBiome}`,
      description: `Discovered new species: ${def.scientificName}`,
      iconPath: def.texturePath,
      rarity: def.rarity
    });
    this.notifyChange();
    return true;
  }

  public recordArtifact(artifactId: string): boolean {
    if (this.discoveredArtifacts.has(artifactId)) return false;
    const def = getArtifactById(artifactId);
    if (!def) return false;

    this.discoveredArtifacts.add(artifactId);
    this.notifyDiscovery({
      type: 'artifact',
      title: def.title,
      subtitle: `${def.category} • ${def.primaryBiome}`,
      description: def.description,
      iconPath: def.texturePath
    });
    this.notifyChange();
    return true;
  }

  public recordLandmark(landmarkId: string): boolean {
    if (this.discoveredLandmarks.has(landmarkId)) return false;
    const def = getLandmarkById(landmarkId);
    if (!def) return false;

    this.discoveredLandmarks.add(landmarkId);
    this.notifyDiscovery({
      type: 'landmark',
      title: def.name,
      subtitle: `Landmark • ${def.primaryBiome}`,
      description: def.description
    });
    this.notifyChange();
    return true;
  }

  public recordBiome(biomeName: string): boolean {
    if (this.visitedBiomes.has(biomeName)) return false;
    this.visitedBiomes.add(biomeName);
    this.notifyDiscovery({
      type: 'biome',
      title: biomeName,
      subtitle: 'New Biome Explored',
      description: `Entered ${biomeName}. New creatures and geological formations await.`
    });
    this.notifyChange();
    return true;
  }

  public setCompanionRescued(rescued: boolean) {
    if (this.companionRescued === rescued) return;
    this.companionRescued = rescued;
    this.notifyChange();
  }

  public updatePlayerMetrics(distanceDelta: number, currentDepth: number) {
    if (distanceDelta > 0) {
      this.totalDistanceSwum += distanceDelta;
    }
    if (currentDepth > this.maxDepthReached) {
      this.maxDepthReached = Math.round(currentDepth * 10) / 10;
    }
    // Periodic save for metrics
    this.scheduleSave();
  }

  public recordEntrance(entranceId: string, name?: string, description?: string): boolean {
    if (this.discoveredEntrances.has(entranceId)) return false;
    this.discoveredEntrances.add(entranceId);
    if (name) {
      this.notifyDiscovery({
        type: 'entrance',
        title: name,
        subtitle: 'Cave Entrance Discovered',
        description: description || 'A newly discovered passage entering the cavern system.',
      });
    }
    this.notifyChange();
    return true;
  }

  public recordSector(x: number, y: number): void {
    const cellSize = 10;
    const cx = Math.floor(x / cellSize);
    const cy = Math.floor(y / cellSize);

    let changed = false;
    // Reveal current cell + adjacent perimeter
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const key = `${cx + ox},${cy + oy}`;
        if (!this.exploredSectors.has(key)) {
          this.exploredSectors.add(key);
          changed = true;
        }
      }
    }

    if (changed) {
      this.scheduleSave();
    }
  }

  public isEntranceDiscovered(id: string): boolean {
    return this.discoveredEntrances.has(id);
  }

  public isSectorExplored(cx: number, cy: number): boolean {
    return this.exploredSectors.has(`${cx},${cy}`);
  }

  public getDiscoveredEntrancesSet(): Set<string> {
    return this.discoveredEntrances;
  }

  public getExploredSectorsSet(): Set<string> {
    return this.exploredSectors;
  }

  public getMapExploredPercent(): number {
    // Total swimmable area covers roughly ~350 sectors
    const targetSectors = 280;
    return Math.min(100, Math.round((this.exploredSectors.size / targetSectors) * 100));
  }

  // --- GETTERS ---
  public isSpeciesDiscovered(id: string): boolean {
    return this.discoveredSpecies.has(id);
  }

  public isArtifactDiscovered(id: string): boolean {
    return this.discoveredArtifacts.has(id);
  }

  public isLandmarkDiscovered(id: string): boolean {
    return this.discoveredLandmarks.has(id);
  }

  public isBiomeVisited(name: string): boolean {
    return this.visitedBiomes.has(name);
  }

  public isCompanionRescued(): boolean {
    return this.companionRescued;
  }

  public getDiscoveredSpeciesList(): SpeciesDefinition[] {
    return SPECIES_CATALOG.filter(s => this.discoveredSpecies.has(s.id));
  }

  public getDiscoveredArtifactsList(): ArtifactDefinition[] {
    return ARTIFACT_CATALOG.filter(a => this.discoveredArtifacts.has(a.id));
  }

  public getDiscoveredLandmarksList(): LandmarkDefinition[] {
    return LANDMARK_CATALOG.filter(l => this.discoveredLandmarks.has(l.id));
  }

  public getStats() {
    const totalSpecies = SPECIES_CATALOG.length;
    const foundSpecies = SPECIES_CATALOG.filter(s => this.discoveredSpecies.has(s.id)).length;
    const totalArtifacts = ARTIFACT_CATALOG.length;
    const foundArtifacts = this.discoveredArtifacts.size;
    const totalLandmarks = LANDMARK_CATALOG.length;
    const foundLandmarks = this.discoveredLandmarks.size;
    const totalBiomes = 5;
    const visitedBiomes = this.visitedBiomes.size;
    const totalEntrances = 17;
    const foundEntrances = this.discoveredEntrances.size;

    const totalItems = totalSpecies + totalArtifacts + totalLandmarks + totalBiomes;
    const foundItems = foundSpecies + foundArtifacts + foundLandmarks + visitedBiomes;
    const completionPercent = totalItems > 0 ? Math.round((foundItems / totalItems) * 100) : 0;

    return {
      totalSpecies,
      foundSpecies,
      totalArtifacts,
      foundArtifacts,
      totalLandmarks,
      foundLandmarks,
      totalBiomes,
      visitedBiomes,
      totalEntrances,
      foundEntrances,
      completionPercent,
      mapExploredPercent: this.getMapExploredPercent(),
      companionRescued: this.companionRescued,
      totalDistanceSwum: Math.round(this.totalDistanceSwum),
      maxDepthReached: this.maxDepthReached
    };
  }

  // --- STORAGE PERSISTENCE ---
  private scheduleSave() {
    if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
    this.saveDebounceTimer = setTimeout(() => {
      this.saveToStorage();
    }, 1000);
  }

  public saveToStorage(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const data: SavePayloadV1 = {
        version: 1,
        timestamp: Date.now(),
        discoveredSpecies: Array.from(this.discoveredSpecies),
        discoveredLandmarks: Array.from(this.discoveredLandmarks),
        discoveredArtifacts: Array.from(this.discoveredArtifacts),
        visitedBiomes: Array.from(this.visitedBiomes),
        discoveredEntrances: Array.from(this.discoveredEntrances),
        exploredSectors: Array.from(this.exploredSectors),
        companionRescued: this.companionRescued,
        totalDistanceSwum: this.totalDistanceSwum,
        maxDepthReached: this.maxDepthReached
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.warn('Failed to save journal data to localStorage:', err);
      return false;
    }
  }

  public loadFromStorage(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Also check legacy companion rescue key if present
        const legacyCompanion = window.localStorage.getItem('underwater_companion_saved');
        if (legacyCompanion === 'true') {
          this.companionRescued = true;
        }
        return false;
      }
      const data = JSON.parse(raw) as SavePayloadV1;
      if (data && data.version === 1) {
        this.discoveredSpecies = new Set(data.discoveredSpecies || []);
        this.discoveredLandmarks = new Set(data.discoveredLandmarks || []);
        this.discoveredArtifacts = new Set(data.discoveredArtifacts || []);
        this.visitedBiomes = new Set(data.visitedBiomes || []);
        this.discoveredEntrances = new Set(data.discoveredEntrances || []);
        this.exploredSectors = new Set(data.exploredSectors || []);
        this.companionRescued = !!data.companionRescued;
        this.totalDistanceSwum = data.totalDistanceSwum || 0;
        this.maxDepthReached = data.maxDepthReached || 0;
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Failed to load journal save from localStorage:', err);
      return false;
    }
  }

  public resetProgress() {
    this.discoveredSpecies.clear();
    this.discoveredLandmarks.clear();
    this.discoveredArtifacts.clear();
    this.visitedBiomes.clear();
    this.discoveredEntrances.clear();
    this.exploredSectors.clear();
    this.companionRescued = false;
    this.totalDistanceSwum = 0;
    this.maxDepthReached = 0;

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem('underwater_companion_saved');
      } catch (e) {
        console.warn('Failed to clear storage:', e);
      }
    }
    this.notifyChange();
  }
}

export const journalManager = JournalManager.getInstance();

