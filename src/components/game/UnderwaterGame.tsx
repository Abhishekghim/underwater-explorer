'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/game/GameEngine';
import { PlayerStats } from '@/game/types';
import {
  PORTFOLIO_NAV_TARGETS,
  PORTFOLIO_STATIONS,
  PortfolioSectionId,
} from '@/game/portfolioData';
import PortfolioOverlaySystem, {
  PortfolioOverlayHandle,
} from './PortfolioOverlaySystem';
import JournalModal from './JournalModal';
import WorldMapModal from './WorldMapModal';
import DiscoveryNotification from './DiscoveryNotification';

export default function UnderwaterGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const overlayRef = useRef<PortfolioOverlayHandle>(null);

  // Track which station index within a multi-card section was last visited via navbar
  const sectionCycleRef = useRef<Record<PortfolioSectionId, number>>({
    home: 0,
    about: 0,
    education: 0,
    skills: 0,
    projects: 0,
    contact: 0,
  });

  const [stats, setStats] = useState<PlayerStats>({
    x: -18.3,
    y: -2.0,
    depthMeters: 0,
    speed: 0,
    zone: 'Surface Waters',
    facing: 'right',
    companionRescued: false,
    canRescueCompanion: false,
    gold: 1250,
    oxygen: 100,
    energy: 100,
  });

  const [activeSection, setActiveSection] =
    useState<PortfolioSectionId>('home');
  const [showControlsHint, setShowControlsHint] = useState(true);
  const [rescueNotification, setRescueNotification] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  useEffect(() => {
    engineRef.current?.setPaused(isJournalOpen || isMapOpen);
  }, [isJournalOpen, isMapOpen]);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current, {
      onStatsUpdate: (newStats) => {
        setStats(newStats);

        // Determine nearest portfolio section for active navbar highlight
        let nearestSec: PortfolioSectionId = 'home';
        let bestDist = Infinity;
        for (let i = 0; i < PORTFOLIO_STATIONS.length; i++) {
          const st = PORTFOLIO_STATIONS[i];
          const d = Math.hypot(newStats.x - st.worldX, newStats.y - st.worldY);
          if (d < bestDist) {
            bestDist = d;
            nearestSec = st.section;
          }
        }
        if (newStats.y > -6.5) nearestSec = 'home';
        setActiveSection(nearestSec);
      },
      onFrameUpdate: (frame) => {
        overlayRef.current?.updateFrame(frame);
      },
      onCompanionRescued: () => {
        setRescueNotification(true);
        setTimeout(() => setRescueNotification(false), 4500);
      },
      onJournalToggle: () => {
        setIsJournalOpen((prev) => !prev);
      },
      onMapToggle: () => {
        setIsMapOpen((prev) => !prev);
      },
    });

    engineRef.current = engine;
    engine.start();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleNavigateTo = (x: number, y: number) => {
    engineRef.current?.navigateToWorldPosition(x, y);
  };

  const handleSectionClick = (secId: PortfolioSectionId) => {
    setActiveSection(secId);
    const matchingStations = PORTFOLIO_STATIONS.filter(
      (s) => s.section === secId
    );
    if (matchingStations.length === 0) return;

    const idx = sectionCycleRef.current[secId] % matchingStations.length;
    const targetStation = matchingStations[idx];
    sectionCycleRef.current[secId] = (idx + 1) % matchingStations.length;

    // Position diver at the station (for surface hero, place diver at water surface -1.8)
    const targetY = secId === 'home' ? -1.8 : targetStation.worldY;
    engineRef.current?.navigateToWorldPosition(targetStation.worldX, targetY);
  };

  const handleTouchDir = (x: number, y: number) => {
    engineRef.current?.inputManager.setVirtualInput(x, y);
  };

  const handleInteract = () => {
    engineRef.current?.triggerInteract();
  };

  const getPortfolioZoneLabel = (depth: number): string => {
    if (depth <= 10) return 'Surface';
    if (depth <= 60) return 'Shallow Water';
    if (depth <= 150) return 'Twilight Zone';
    if (depth <= 320) return 'Midnight Zone';
    if (depth <= 750) return 'Abyssal Zone';
    return 'Hadal Zone';
  };

  const depthProgressPct = Math.min(
    100,
    Math.max(0, (stats.depthMeters / 1000) * 100)
  );
  const isAtSurface = stats.depthMeters <= 12;

  return (
    <div style={styles.wrapper}>
      {/* Three.js Canvas Container */}
      <div ref={containerRef} style={styles.canvasContainer} />

      {/* World-Space Portfolio Cards, Progressive Depth Darkness Canvas & Draggable Lottie Jellyfish */}
      <PortfolioOverlaySystem
        ref={overlayRef}
        onNavigateTo={handleNavigateTo}
      />

      {/* Minimal Top-Right Map & Journal Buttons (Navbar Removed) */}
      <div style={styles.topRightFloatingActions}>
        <button
          type="button"
          onClick={() => setIsMapOpen(true)}
          style={styles.navActionBtn}
          title="Open World Map (M)"
        >
          🗺️ Map <kbd style={styles.miniKbd}>M</kbd>
        </button>
        <button
          type="button"
          onClick={() => setIsJournalOpen(true)}
          style={styles.navActionBtn}
          title="Open Explorer Journal (J)"
        >
          📖 Journal <kbd style={styles.miniKbd}>J</kbd>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          RIGHT-SIDE DEPTH HUD (from C:\xampp\htdocs\portfolio\index.html)
      ═══════════════════════════════════════════════════════════════════════ */}
      <aside id="pf-depth-hud" aria-label="Depth indicator">
        <div id="pf-depth-label">DEPTH</div>
        <div
          id="pf-depth-bar-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(depthProgressPct)}
        >
          <div
            id="pf-depth-bar-fill"
            style={{ height: `${depthProgressPct}%` }}
          />
        </div>
        <div id="pf-depth-readout">{stats.depthMeters} m</div>
        <div id="pf-depth-zone">{getPortfolioZoneLabel(stats.depthMeters)}</div>
      </aside>

      {/* Trapped Fish Proximity Interaction Prompt */}
      {stats.canRescueCompanion && !stats.companionRescued && (
        <div style={styles.rescuePrompt}>
          <div style={styles.rescuePromptInner}>
            <span style={styles.rescuePromptIcon}>🪝</span>
            <div style={styles.rescuePromptText}>
              <strong>A fish is trapped in abandoned fishing net!</strong>
              <span>Help free it from the tangled cords.</span>
            </div>
            <button
              onClick={handleInteract}
              style={styles.rescueActionBtn}
              aria-label="Free the trapped fish"
            >
              Press <kbd style={styles.kbdHighlight}>E</kbd> to Rescue
            </button>
          </div>
        </div>
      )}

      {/* Artifact Proximity Interaction Prompt */}
      {stats.nearbyArtifact && !stats.canRescueCompanion && (
        <div style={styles.artifactPrompt}>
          <div style={styles.rescuePromptInner}>
            <span style={styles.rescuePromptIcon}>🏺</span>
            <div style={styles.rescuePromptText}>
              <strong>{stats.nearbyArtifact.title}</strong>
              <span>
                {stats.nearbyArtifact.isDiscovered
                  ? `${stats.nearbyArtifact.category} • Salvaged & Recorded in Journal`
                  : `${stats.nearbyArtifact.category} • Unsalvaged Historical Relic Nearby`}
              </span>
            </div>
            <button
              onClick={handleInteract}
              style={styles.artifactActionBtn}
              aria-label="Examine Relic"
            >
              Press <kbd style={styles.kbdHighlight}>E</kbd> to{' '}
              {stats.nearbyArtifact.isDiscovered ? 'Inspect' : 'Salvage'}
            </button>
          </div>
        </div>
      )}

      {/* Rescue Toast Notification */}
      {rescueNotification && (
        <div style={styles.toastNotification}>
          <span>
            ✨ You rescued Lumi! It now illuminates the dark depths around you.
          </span>
        </div>
      )}

      {/* Discovery Notification Toast */}
      <DiscoveryNotification />

      {/* Field Journal Modal */}
      <JournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        onOpenMap={() => setIsMapOpen(true)}
        currentDepthMeters={stats.depthMeters}
      />

      {/* Interactive World Map Modal */}
      <WorldMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        playerStats={stats}
      />

      {/* Controls Hint Banner */}
      {showControlsHint && (
        <aside style={styles.controlsBanner}>
          <div style={styles.controlsBannerInner}>
            <span style={styles.bannerTitle}>🤿 PORTFOLIO EXPLORER</span>
            <span style={styles.bannerItem}>
              <kbd style={styles.kbd}>W</kbd>
              <kbd style={styles.kbd}>A</kbd>
              <kbd style={styles.kbd}>S</kbd>
              <kbd style={styles.kbd}>D</kbd> or <kbd style={styles.kbd}>Arrows</kbd> Swim
            </span>
            <span style={styles.bannerItem}>
              <kbd style={styles.kbd}>Shift</kbd> Boost
            </span>
            <span style={styles.bannerItem}>
              <span>🪼 Drag Jellyfish in Deep Zones to Light Cards</span>
            </span>
            <span style={styles.bannerItem}>
              <kbd style={styles.kbd}>M</kbd> World Map
            </span>
            <button
              onClick={() => setShowControlsHint(false)}
              style={styles.closeHintBtn}
              aria-label="Dismiss controls hint"
            >
              ✕
            </button>
          </div>
        </aside>
      )}

      {/* Onscreen Touch / Mobile D-Pad */}
      <div style={styles.mobileControls}>
        <div style={styles.dpadRow}>
          <button
            style={styles.dpadBtn}
            onPointerDown={() => handleTouchDir(0, 1)}
            onPointerUp={() => handleTouchDir(0, 0)}
            onPointerLeave={() => handleTouchDir(0, 0)}
            aria-label="Swim Up"
          >
            ▲
          </button>
        </div>
        <div style={styles.dpadRow}>
          <button
            style={styles.dpadBtn}
            onPointerDown={() => handleTouchDir(-1, 0)}
            onPointerUp={() => handleTouchDir(0, 0)}
            onPointerLeave={() => handleTouchDir(0, 0)}
            aria-label="Swim Left"
          >
            ◀
          </button>
          <button
            style={styles.dpadBtnCenter}
            onPointerDown={() =>
              engineRef.current?.particleSystem.spawnBubbleBurst(
                stats.x,
                stats.y,
                5
              )
            }
            aria-label="Bubble Burst"
          >
            🫧
          </button>
          <button
            style={styles.dpadBtn}
            onPointerDown={() => handleTouchDir(1, 0)}
            onPointerUp={() => handleTouchDir(0, 0)}
            onPointerLeave={() => handleTouchDir(0, 0)}
            aria-label="Swim Right"
          >
            ▶
          </button>
        </div>
        <div style={styles.dpadRow}>
          <button
            style={styles.dpadBtn}
            onPointerDown={() => handleTouchDir(0, -1)}
            onPointerUp={() => handleTouchDir(0, 0)}
            onPointerLeave={() => handleTouchDir(0, 0)}
            aria-label="Swim Down"
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#000000',
    color: '#f8fafc',
    userSelect: 'none',
  },
  canvasContainer: {
    width: '100%',
    height: '100%',
    display: 'block',
    outline: 'none',
  },
  topRightFloatingActions: {
    position: 'fixed',
    top: 16,
    right: 18,
    zIndex: 895,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  navRightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  compactVitalsPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 12px',
    borderRadius: 30,
    backgroundColor: 'rgba(2, 16, 30, 0.65)',
    border: '1px solid rgba(0, 212, 255, 0.22)',
    fontSize: 11,
    letterSpacing: '0.04em',
  },
  vitalMiniItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  vitalSep: {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  navActionBtn: {
    padding: '6px 12px',
    borderRadius: 30,
    backgroundColor: 'rgba(0, 212, 255, 0.10)',
    border: '1px solid rgba(0, 212, 255, 0.30)',
    color: '#e0f2fe',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  miniKbd: {
    display: 'inline-block',
    padding: '1px 5px',
    backgroundColor: 'rgba(0, 212, 255, 0.22)',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    color: '#00d4ff',
  },
  rescuePrompt: {
    position: 'absolute',
    bottom: 92,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 85,
    pointerEvents: 'auto',
  },
  artifactPrompt: {
    position: 'absolute',
    bottom: 92,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 85,
    pointerEvents: 'auto',
  },
  rescuePromptInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 20px',
    backgroundColor: 'rgba(6, 22, 38, 0.94)',
    backdropFilter: 'blur(12px)',
    borderRadius: 16,
    border: '1.5px solid #00d4ff',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
  },
  rescuePromptIcon: {
    fontSize: 24,
  },
  rescuePromptText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    fontSize: 13,
    color: '#e2e8f0',
  },
  rescueActionBtn: {
    padding: '8px 14px',
    backgroundColor: '#0284c7',
    border: '1px solid #38bdf8',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  artifactActionBtn: {
    padding: '8px 14px',
    backgroundColor: '#d97706',
    border: '1px solid #fbbf24',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  kbdHighlight: {
    display: 'inline-block',
    padding: '1px 6px',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 4,
    border: '1px solid rgba(255, 255, 255, 0.4)',
    fontWeight: 800,
  },
  toastNotification: {
    position: 'absolute',
    top: 78,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 90,
    padding: '10px 20px',
    backgroundColor: 'rgba(6, 78, 59, 0.92)',
    backdropFilter: 'blur(8px)',
    border: '1px solid #10b981',
    borderRadius: 999,
    color: '#ecfdf5',
    fontSize: 13,
    fontWeight: 600,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
    pointerEvents: 'none',
  },
  controlsBanner: {
    position: 'absolute',
    bottom: 14,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 80,
    maxWidth: '94vw',
  },
  controlsBannerInner: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    padding: '8px 18px',
    backgroundColor: 'rgba(3, 18, 34, 0.82)',
    backdropFilter: 'blur(12px)',
    borderRadius: 999,
    border: '1px solid rgba(0, 212, 255, 0.25)',
    fontSize: 11,
    color: '#cbd5e1',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.55)',
  },
  bannerTitle: {
    fontWeight: 600,
    color: '#00d4ff',
    letterSpacing: '0.1em',
  },
  bannerItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  kbd: {
    display: 'inline-block',
    padding: '2px 6px',
    backgroundColor: 'rgba(15, 35, 58, 0.9)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: 4,
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 700,
    color: '#f8fafc',
  },
  closeHintBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 13,
    padding: '2px 4px',
    lineHeight: 1,
  },
  mobileControls: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    zIndex: 80,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    opacity: 0.72,
  },
  dpadRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 4,
  },
  dpadBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(3, 18, 34, 0.85)',
    border: '1px solid rgba(0, 212, 255, 0.25)',
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'none',
  },
  dpadBtnCenter: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 212, 255, 0.16)',
    border: '1px solid rgba(0, 212, 255, 0.35)',
    color: '#38bdf8',
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'none',
  },
};
