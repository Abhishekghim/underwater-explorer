export interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number; // Bottom of the sea (e.g. -140)
  maxY: number; // Sea surface sky top (e.g. 14)
}

export type BiomeZone =
  | 'Surface Waters'
  | 'Sunlit Shallows'
  | 'Twilight Reef'
  | 'Midnight Trench'
  | 'Abyssal Depths';

export interface NearbyArtifactInfo {
  id: string;
  title: string;
  category: string;
  description: string;
  isDiscovered: boolean;
}

export interface PlayerStats {
  x: number;
  y: number;
  depthMeters: number;
  speed: number;
  zone: BiomeZone;
  facing: 'left' | 'right';
  companionRescued: boolean;
  canRescueCompanion: boolean;
  nearbyArtifact?: NearbyArtifactInfo | null;
  gold: number;
  oxygen: number;
  energy: number;
}

export interface FrameCameraState {
  camX: number;
  camY: number;
  viewWidth: number;
  viewHeight: number;
  diverX: number;
  diverY: number;
  diverFacing: 1 | -1;
  diverPitch: number;
  beamOriginX: number;
  beamOriginY: number;
  beamDirX: number;
  beamDirY: number;
  companionX: number | null;
  companionY: number | null;
  companionActive: boolean;
  depthMeters: number;
}

export interface GameEngineOptions {
  onStatsUpdate?: (stats: PlayerStats) => void;
  onFrameUpdate?: (frame: FrameCameraState) => void;
  onRescuePromptChange?: (canRescue: boolean) => void;
  onCompanionRescued?: () => void;
  onArtifactExamined?: (artifact: NearbyArtifactInfo) => void;
  onJournalToggle?: () => void;
  onMapToggle?: () => void;
}
