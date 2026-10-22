'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  EXPANDED_WORLD_BOUNDS,
  MAP_PALETTE,
  CAVE_ENTRANCES_CATALOG,
  NAV_CIRCUITS,
  MAP_LANDMARKS,
  WORLD_REGIONS,
  CaveEntrance,
  MapLandmark,
} from '@/game/mapData';
import { PORTFOLIO_STATIONS } from '@/game/portfolioData';
import { journalManager } from '@/game/JournalManager';
import { PlayerStats } from '@/game/types';

interface WorldMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerStats?: PlayerStats;
}

export default function WorldMapModal({
  isOpen,
  onClose,
  playerStats,
}: WorldMapModalProps) {
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedItem, setSelectedItem] = useState<{
    title: string;
    type: string;
    description: string;
    coords: string;
  } | null>(null);

  const [showRoutes, setShowRoutes] = useState(true);
  const [showPortfolio, setShowPortfolio] = useState(true);
  const [showEntrances, setShowEntrances] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showFogOfWar, setShowFogOfWar] = useState(false);
  const [, setTick] = useState(0);

  // Subscribe to journal manager changes (discoveries, sectors)
  useEffect(() => {
    return journalManager.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  // Keyboard shortcut: close with Esc or M
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyM') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const discoveredEntrances = journalManager.getDiscoveredEntrancesSet();
  const exploredSectors = journalManager.getExploredSectorsSet();
  const stats = journalManager.getStats();

  // Map world dimensions calibrated directly to the authentic labyrinth
  const MAP_BOUNDS = {
    minX: -92,
    maxX: 92,
    minY: -138,
    maxY: 8,
  };
  const worldW = MAP_BOUNDS.maxX - MAP_BOUNDS.minX; // 184
  const worldH = MAP_BOUNDS.maxY - MAP_BOUNDS.minY; // 146

  // Transform world (X, Y) into SVG space
  const toSvgX = (x: number) => x - MAP_BOUNDS.minX;
  const toSvgY = (y: number) => MAP_BOUNDS.maxY - y;

  // Transform polygon points into SVG points string
  const polyToSvgPoints = (points: [number, number][]) => {
    return points.map(([px, py]) => `${toSvgX(px)},${toSvgY(py)}`).join(' ');
  };

  const diverSvgX = playerStats ? toSvgX(playerStats.x) : toSvgX(-18.3);
  const diverSvgY = playerStats ? toSvgY(playerStats.y) : toSvgY(-6.45);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const centerOnDiver = () => {
    setZoom(1.35);
    // Center SVG diver coordinates in view
    setPan({ x: 0, y: 0 });
  };

  return (
    <div style={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.radarIcon}>🗺️</div>
            <div>
              <div style={styles.kicker}>EXPEDITION HYDROGRAPHIC ATLAS • BATHYMETRIC TELEMETRY</div>
              <h2 style={styles.title}>Subterranean Labyrinth World Map</h2>
              <div style={styles.subtitle}>
                <span>{stats.mapExploredPercent}% Charted</span> •{' '}
                <span>{stats.foundEntrances} / 17 Cave Entrances Logged</span> •{' '}
                <span>Diver Position: [{playerStats?.x ?? 0}, {playerStats?.y ?? 0}] • Depth: {playerStats?.depthMeters ?? 0}m</span>
              </div>
            </div>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.controlsRow}>
              <button
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                style={styles.toolBtn}
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
                style={styles.toolBtn}
                title="Zoom Out"
              >
                −
              </button>
              <button
                onClick={centerOnDiver}
                style={styles.toolBtnText}
                title="Center view on diver location"
              >
                🎯 Diver
              </button>
            </div>

            <button
              onClick={onClose}
              style={styles.closeBtn}
              aria-label="Close Map (Esc or M)"
              title="Close Map (Esc or M)"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Filter / Layer Toggle Bar */}
        <div style={styles.filterBar}>
          <label style={styles.filterToggle}>
            <input
              type="checkbox"
              checked={showPortfolio}
              onChange={(e) => setShowPortfolio(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={{ color: '#00d4ff' }}>❖ Portfolio Stations ({PORTFOLIO_STATIONS.length})</span>
          </label>

          <label style={styles.filterToggle}>
            <input
              type="checkbox"
              checked={showEntrances}
              onChange={(e) => setShowEntrances(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={{ color: MAP_PALETTE.underwater.shallow }}>◎ Cave Chambers (17)</span>
          </label>

          <label style={styles.filterToggle}>
            <input
              type="checkbox"
              checked={showLandmarks}
              onChange={(e) => setShowLandmarks(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={{ color: '#facc15' }}>★ Landmarks</span>
          </label>

          <label style={styles.filterToggle}>
            <input
              type="checkbox"
              checked={showFogOfWar}
              onChange={(e) => setShowFogOfWar(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={{ color: '#94a3b8' }}>☁ Fog of War</span>
          </label>
        </div>

        {/* Map Viewport Area */}
        <div
          style={styles.mapViewport}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div
            style={{
              ...styles.mapCanvasWrapper,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <svg
              viewBox={`0 0 ${worldW} ${worldH}`}
              style={styles.svgMap}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Oceanic Vertical Depth Gradient (Bright & Clear) */}
                <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#87ceeb" />
                  <stop offset="6%" stopColor="#4ba8d0" />
                  <stop offset="14%" stopColor="#1e78a6" />
                  <stop offset="25%" stopColor="#155779" />
                  <stop offset="38%" stopColor="#124a67" />
                  <stop offset="52%" stopColor="#0f3e57" />
                  <stop offset="66%" stopColor="#0d354b" />
                  <stop offset="78%" stopColor="#0b2c3f" />
                  <stop offset="88%" stopColor="#092535" />
                  <stop offset="100%" stopColor="#071924" />
                </linearGradient>

                {/* Subterranean Obsidian Rock Pattern */}
                <pattern id="rockGrid" width="4" height="4" patternUnits="userSpaceOnUse">
                  <path d="M 0 4 L 4 0 M 0 0 L 4 4" fill="none" stroke="#081320" strokeWidth="0.3" />
                </pattern>

                {/* Blinking Diver Radar Keyframe */}
                <style>{`
                  @keyframes mapDiverPulse {
                    0% { r: 1.5; opacity: 1; }
                    100% { r: 5.5; opacity: 0; }
                  }
                `}</style>
              </defs>

              {/* 1. Oceanic Background Water Gradient */}
              <rect x="0" y="0" width={worldW} height={worldH} fill="url(#oceanGradient)" />

              {/* Depth Zone Dividers & Labels */}
              <g opacity="0.45">
                {/* Surface Waters / Shallows line at 20m (Y = -5 in world) */}
                <line x1="0" y1={toSvgY(-5)} x2={worldW} y2={toSvgY(-5)} stroke="#ffffff" strokeDasharray="2,2" strokeWidth="0.4" />
                <text x="4" y={toSvgY(-3)} fill="#1e7fa8" fontSize="3.2" fontWeight="800">SURFACE WATERS (0m - 20m)</text>

                {/* Shallows / Twilight Reef line at 90m (Y = -35 in world) */}
                <line x1="0" y1={toSvgY(-35)} x2={worldW} y2={toSvgY(-35)} stroke="#ffffff" strokeDasharray="2,2" strokeWidth="0.4" />
                <text x="4" y={toSvgY(-32)} fill="#0d4a68" fontSize="3.2" fontWeight="800">SUNLIT SHALLOWS (20m - 90m)</text>

                {/* Twilight / Midnight Trench line at 215m (Y = -75 in world) */}
                <line x1="0" y1={toSvgY(-75)} x2={worldW} y2={toSvgY(-75)} stroke="#ffffff" strokeDasharray="2,2" strokeWidth="0.4" />
                <text x="4" y={toSvgY(-72)} fill="#38bdf8" fontSize="3.2" fontWeight="800">TWILIGHT REEF (90m - 215m)</text>

                {/* Midnight / Abyssal line at 325m (Y = -105 in world) */}
                <line x1="0" y1={toSvgY(-105)} x2={worldW} y2={toSvgY(-105)} stroke="#ffffff" strokeDasharray="2,2" strokeWidth="0.4" />
                <text x="4" y={toSvgY(-102)} fill="#00d4ff" fontSize="3.2" fontWeight="800">MIDNIGHT TRENCH (215m - 325m)</text>

                {/* Abyssal line at 420m (Y = -132 in world) */}
                <line x1="0" y1={toSvgY(-132)} x2={worldW} y2={toSvgY(-132)} stroke="#ffffff" strokeDasharray="2,2" strokeWidth="0.4" />
                <text x="4" y={toSvgY(-130)} fill="#94a3b8" fontSize="3.2" fontWeight="800">ABYSSAL DEPTHS (325m - 450m+)</text>
              </g>

              {/* 1b. Submerged Ruins & Wrecks Background Artwork (Under Surface Y <= 0 Only) */}
              <image
                href="/assets/environment/underwater_background.png"
                x={toSvgX(-98.0)}
                y={toSvgY(0)}
                width={196.0}
                height={146.2}
                preserveAspectRatio="none"
                opacity="0.30"
              />

              {/* 2. Solid Rock Formations (Rendered from official vector labyrinth map) */}
              <g id="solidRockFormations">
                {/* Vector SVG Labyrinth Map */}
                <image
                  href="/assets/environment/landmass_clean.svg"
                  x={toSvgX(-91.8)}
                  y={toSvgY(10.05)}
                  width={183.6}
                  height={147.15}
                  preserveAspectRatio="none"
                />
              </g>

              {/* 3. Four Interconnected Navigational Circuits & Dashed Routes */}
              {showRoutes && (
                <g id="navCircuitsGroup">
                  {NAV_CIRCUITS.map((circuit) => {
                    const pointsStr = circuit.waypoints
                      .map(([wx, wy]) => `${toSvgX(wx)},${toSvgY(wy)}`)
                      .join(' ');
                    const strokeColor =
                      circuit.category === 'primary'
                        ? '#00c2c7'
                        : circuit.category === 'secondary'
                        ? '#97ebdb'
                        : '#facc15';

                    return (
                      <polyline
                        key={circuit.id}
                        points={pointsStr}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="0.9"
                        strokeDasharray="2.5, 2.0"
                        strokeLinecap="round"
                        opacity="0.85"
                        style={{ animation: 'routeDash 20s linear infinite' }}
                      />
                    );
                  })}
                </g>
              )}

              {/* 4. Cave Entrances (All 17 Distributed Interconnected Openings) */}
              {showEntrances && (
                <g id="caveEntrancesGroup">
                  {CAVE_ENTRANCES_CATALOG.map((ent) => {
                    const ex = toSvgX(ent.worldPosition.x);
                    const ey = toSvgY(ent.worldPosition.y);
                    const isDiscovered = discoveredEntrances.has(ent.id);

                    return (
                      <g
                        key={ent.id}
                        onClick={() =>
                          setSelectedItem({
                            title: ent.name,
                            type: 'Cave Entrance',
                            description: ent.description,
                            coords: `[${ent.worldPosition.x}, ${ent.worldPosition.y}] • Depth: ${ent.depthMeters}m`,
                          })
                        }
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Outer Glow Ring */}
                        <circle
                          cx={ex}
                          cy={ey}
                          r={isDiscovered ? 2.8 : 2.0}
                          fill={isDiscovered ? 'rgba(0, 194, 199, 0.25)' : 'rgba(255, 255, 255, 0.1)'}
                          stroke={isDiscovered ? '#00c2c7' : '#94a3b8'}
                          strokeWidth="0.5"
                          strokeDasharray={isDiscovered ? 'none' : '1, 1'}
                        />
                        {/* Center Dot */}
                        <circle
                          cx={ex}
                          cy={ey}
                          r={isDiscovered ? 1.2 : 0.8}
                          fill={isDiscovered ? '#daf8e3' : '#64748b'}
                        />
                        {/* Entrance Name Label */}
                        <text
                          x={ex}
                          y={ey - 3.5}
                          textAnchor="middle"
                          fill={isDiscovered ? '#ffffff' : '#94a3b8'}
                          fontSize="2.4"
                          fontWeight="700"
                          style={{ textShadow: '0 0 3px rgba(0,0,0,0.9)' }}
                        >
                          {isDiscovered ? ent.name : 'Unknown Opening'}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* 5. Major Landmarks, Wrecks & Discoveries */}
              {showLandmarks && (
                <g id="landmarksGroup">
                  {MAP_LANDMARKS.map((lm) => {
                    const lx = toSvgX(lm.worldPosition.x);
                    const ly = toSvgY(lm.worldPosition.y);
                    const isFound = journalManager.isLandmarkDiscovered(lm.id);

                    return (
                      <g
                        key={lm.id}
                        onClick={() =>
                          setSelectedItem({
                            title: lm.name,
                            type: `${lm.category} Landmark`,
                            description: lm.description,
                            coords: `[${lm.worldPosition.x}, ${lm.worldPosition.y}]`,
                          })
                        }
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          cx={lx}
                          cy={ly}
                          r="3.2"
                          fill="rgba(8, 15, 27, 0.85)"
                          stroke="#facc15"
                          strokeWidth="0.6"
                        />
                        <text
                          x={lx}
                          y={ly + 1.2}
                          textAnchor="middle"
                          fontSize="3.2"
                        >
                          {lm.icon}
                        </text>
                        <text
                          x={lx}
                          y={ly + 5.5}
                          textAnchor="middle"
                          fill="#facc15"
                          fontSize="2.4"
                          fontWeight="800"
                          style={{ textShadow: '0 0 3px rgba(0,0,0,0.9)' }}
                        >
                          {lm.name}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* 5b. Portfolio Stations (Resume & Portfolio Cards across Caverns) */}
              {showPortfolio && (
                <g id="portfolioStationsGroup">
                  {PORTFOLIO_STATIONS.map((st) => {
                    const sx = toSvgX(st.worldX);
                    const sy = toSvgY(st.worldY);
                    return (
                      <g
                        key={st.id}
                        onClick={() =>
                          setSelectedItem({
                            title: st.title,
                            type: `Portfolio · ${st.section.toUpperCase()}`,
                            description: st.depthBadge,
                            coords: `[${st.worldX}, ${st.worldY}]`,
                          })
                        }
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          cx={sx}
                          cy={sy}
                          r="3.2"
                          fill="rgba(0, 212, 255, 0.22)"
                          stroke="#00d4ff"
                          strokeWidth="0.7"
                        />
                        <circle cx={sx} cy={sy} r="1.3" fill="#00d4ff" />
                        <text
                          x={sx}
                          y={sy - 4.0}
                          textAnchor="middle"
                          fill="#00d4ff"
                          fontSize="2.3"
                          fontWeight="800"
                          style={{ textShadow: '0 0 3px rgba(0,0,0,0.95)' }}
                        >
                          {st.title}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* 6. Fog of War (Unexplored Sectors Shrouded in Deep Navy Mist) */}
              {showFogOfWar && (
                <g id="fogOfWarLayer">
                  {/* Grid resolution 10x10 world units */}
                  {Array.from({ length: Math.ceil(worldW / 10) }).map((_, col) => {
                    return Array.from({ length: Math.ceil(worldH / 10) }).map((_, row) => {
                      const wx = MAP_BOUNDS.minX + col * 10;
                      const wy = MAP_BOUNDS.maxY - row * 10;
                      const cx = Math.floor(wx / 10);
                      const cy = Math.floor(wy / 10);
                      const isExplored = exploredSectors.has(`${cx},${cy}`);

                      if (isExplored) return null;

                      return (
                        <rect
                          key={`fog_${col}_${row}`}
                          x={col * 10}
                          y={row * 10}
                          width="10.2"
                          height="10.2"
                          fill="rgba(3, 8, 18, 0.88)"
                          stroke="rgba(10, 20, 35, 0.5)"
                          strokeWidth="0.2"
                        />
                      );
                    });
                  })}
                </g>
              )}

              {/* 7. Live Diver Telemetry Beacon */}
              <g id="diverBeaconGroup" transform={`translate(${diverSvgX}, ${diverSvgY})`}>
                {/* Blinking radar pulse wave */}
                <circle
                  cx="0"
                  cy="0"
                  r="4"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="0.6"
                  style={{ animation: 'mapDiverPulse 1.8s infinite ease-out' }}
                />
                {/* Diver Marker Center */}
                <circle cx="0" cy="0" r="2.2" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
                <text x="0" y="0.8" textAnchor="middle" fontSize="2.0">🤿</text>

                {/* Heading Arrow indicator */}
                {playerStats && (
                  <path
                    d={playerStats.facing === 'right' ? 'M 2.5 0 L 4.5 -1 L 4.5 1 Z' : 'M -2.5 0 L -4.5 -1 L -4.5 1 Z'}
                    fill="#facc15"
                  />
                )}
              </g>
            </svg>
          </div>
        </div>

        {/* Selected Item Info Footer */}
        {selectedItem && (
          <footer style={styles.infoFooter}>
            <div style={styles.infoTitleRow}>
              <span style={styles.infoType}>{selectedItem.type}</span>
              <strong style={styles.infoTitle}>{selectedItem.title}</strong>
              <span style={styles.infoCoords}>{selectedItem.coords}</span>
              <button
                onClick={() => setSelectedItem(null)}
                style={styles.infoCloseBtn}
                aria-label="Dismiss detail"
              >
                ✕
              </button>
            </div>
            <p style={styles.infoDesc}>{selectedItem.description}</p>
          </footer>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.88)',
    backdropFilter: 'blur(10px)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    userSelect: 'none',
  },
  modal: {
    width: '100%',
    maxWidth: 1150,
    height: '92vh',
    maxHeight: 780,
    backgroundColor: 'rgba(6, 14, 26, 0.96)',
    borderRadius: 16,
    border: '1px solid rgba(56, 189, 248, 0.3)',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 194, 199, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    backgroundColor: 'rgba(8, 18, 32, 0.9)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  radarIcon: {
    fontSize: 26,
  },
  kicker: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.1em',
    color: '#00c2c7',
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    color: '#f8fafc',
    margin: '2px 0',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  controlsRow: {
    display: 'flex',
    gap: 6,
  },
  toolBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnText: {
    padding: '0 12px',
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    padding: '8px 20px',
    backgroundColor: 'rgba(4, 10, 20, 0.75)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  filterToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  checkbox: {
    cursor: 'pointer',
  },
  mapViewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#020617',
    cursor: 'grab',
  },
  mapCanvasWrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.05s linear',
  },
  svgMap: {
    width: '98%',
    height: '98%',
    display: 'block',
    filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.8))',
  },
  infoFooter: {
    padding: '12px 20px',
    backgroundColor: 'rgba(8, 18, 32, 0.95)',
    borderTop: '1px solid rgba(56, 189, 248, 0.25)',
  },
  infoTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  infoType: {
    padding: '2px 6px',
    borderRadius: 4,
    backgroundColor: 'rgba(0, 194, 199, 0.2)',
    border: '1px solid #00c2c7',
    fontSize: 10,
    fontWeight: 800,
    color: '#97ebdb',
  },
  infoTitle: {
    fontSize: 14,
    color: '#ffffff',
  },
  infoCoords: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 'auto',
  },
  infoCloseBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 12,
    marginLeft: 8,
  },
  infoDesc: {
    margin: 0,
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 1.4,
  },
};

