'use client';

import React, { useEffect, useState } from 'react';
import { journalManager } from '@/game/JournalManager';
import {
  SPECIES_CATALOG,
  SpeciesDefinition,
  getRarityColor,
  BiomeName,
} from '@/game/speciesData';
import {
  ARTIFACT_CATALOG,
  ArtifactDefinition,
  LANDMARK_CATALOG,
} from '@/game/artifactData';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMap?: () => void;
  currentDepthMeters?: number;
}

type TabType = 'species' | 'landmarks' | 'artifacts' | 'map';

export default function JournalModal({
  isOpen,
  onClose,
  onOpenMap,
  currentDepthMeters = 0,
}: JournalModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('species');
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesDefinition | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactDefinition | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState<string>('All');
  const [confirmReset, setConfirmReset] = useState(false);
  const [, setTick] = useState(0);

  // Subscribe to journal manager changes
  useEffect(() => {
    return journalManager.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  // Keyboard close on Esc or J
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyJ') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const stats = journalManager.getStats();

  if (!isOpen) return null;

  const filteredSpecies = SPECIES_CATALOG.filter((s) => {
    if (speciesFilter === 'All') return true;
    return s.primaryBiome === speciesFilter;
  });

  const biomesList: BiomeName[] = [
    'Surface Waters',
    'Sunlit Shallows',
    'Twilight Reef',
    'Midnight Trench',
    'Abyssal Depths',
  ];

  const handleResetData = () => {
    journalManager.resetProgress();
    setConfirmReset(false);
  };

  return (
    <div style={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Top Research Header */}
        <header style={styles.header}>
          <div style={styles.headerTitleGroup}>
            <div style={styles.headerIconWrapper}>
              <span style={styles.headerIcon}>◈</span>
            </div>
            <div>
              <div style={styles.headerKicker}>EXPEDITION ARCHIVE • MARINE TAXONOMY STATION</div>
              <h2 style={styles.headerTitle}>Field Discovery Journal</h2>
              <span style={styles.headerSubtitle}>
                {stats.foundSpecies} / {stats.totalSpecies} Marine Taxa Logged • {stats.foundArtifacts} / {stats.totalArtifacts} Relics • {stats.completionPercent}% Survey Complete
              </span>
            </div>
          </div>

          <div style={styles.headerActions}>
            <div style={styles.progressBarWrapper}>
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${stats.completionPercent}%`,
                }}
              />
            </div>
            <button
              onClick={onClose}
              style={styles.closeBtn}
              aria-label="Close Journal (Esc)"
              title="Close Journal (Esc or J)"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav style={styles.tabNav}>
          <button
            onClick={() => { setActiveTab('species'); setSelectedSpecies(null); }}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'species' ? styles.tabBtnActive : {}),
            }}
          >
            ◈ Marine Fauna ({stats.foundSpecies}/{stats.totalSpecies})
          </button>
          <button
            onClick={() => { setActiveTab('landmarks'); setSelectedArtifact(null); }}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'landmarks' ? styles.tabBtnActive : {}),
            }}
          >
            🏛️ Geological Survey ({stats.foundLandmarks}/{stats.totalLandmarks})
          </button>
          <button
            onClick={() => { setActiveTab('artifacts'); setSelectedArtifact(null); }}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'artifacts' ? styles.tabBtnActive : {}),
            }}
          >
            🏺 Salvaged Relics ({stats.foundArtifacts}/{stats.totalArtifacts})
          </button>
          <button
            onClick={() => setActiveTab('map')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'map' ? styles.tabBtnActive : {}),
            }}
          >
            🗺️ Bathymetry & Telemetry
          </button>
        </nav>

        {/* Content Area */}
        <div style={styles.contentArea}>
          {/* TAB 1: MARINE FAUNA DIRECTORY */}
          {activeTab === 'species' && !selectedSpecies && (
            <div>
              {/* Depth Bracket Filter Bar */}
              <div style={styles.filterBar}>
                {['All', ...biomesList].map((biome) => {
                  const label =
                    biome === 'All'
                      ? 'ALL TAXA'
                      : biome === 'Surface Waters'
                      ? 'SURFACE (0-25m)'
                      : biome === 'Sunlit Shallows'
                      ? 'SHALLOWS (25-90m)'
                      : biome === 'Twilight Reef'
                      ? 'TWILIGHT (90-215m)'
                      : biome === 'Midnight Trench'
                      ? 'TRENCH (215-325m)'
                      : 'ABYSS (325m+)';

                  return (
                    <button
                      key={biome}
                      onClick={() => setSpeciesFilter(biome)}
                      style={{
                        ...styles.filterBtn,
                        ...(speciesFilter === biome ? styles.filterBtnActive : {}),
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Species Grid */}
              <div style={styles.grid}>
                {filteredSpecies.map((s) => {
                  const isDiscovered = journalManager.isSpeciesDiscovered(s.id);
                  const rarityCol = getRarityColor(s.rarity);

                  return (
                    <div
                      key={s.id}
                      onClick={() => isDiscovered && setSelectedSpecies(s)}
                      style={{
                        ...styles.card,
                        cursor: isDiscovered ? 'pointer' : 'default',
                        borderColor: isDiscovered ? `${rarityCol}44` : 'rgba(56, 189, 248, 0.08)',
                      }}
                      title={isDiscovered ? 'Click to inspect scientific dossier' : s.discoveryHint}
                    >
                      <div style={styles.cardImageWrapper}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.texturePath}
                          alt={isDiscovered ? s.name : 'Unidentified specimen silhouette'}
                          style={{
                            ...styles.cardImg,
                            filter: isDiscovered
                              ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.65))'
                              : 'brightness(0) drop-shadow(0 0 1px rgba(56, 189, 248, 0.35))',
                            opacity: isDiscovered ? 1 : 0.28,
                          }}
                        />
                        {!isDiscovered && (
                          <div style={styles.mysteryOverlay}>
                            <span style={styles.mysteryCode}>?</span>
                          </div>
                        )}
                      </div>

                      <div style={styles.cardBody}>
                        <div style={styles.pillRow}>
                          <span
                            style={{
                              ...styles.rarityPill,
                              backgroundColor: `${rarityCol}18`,
                              color: rarityCol,
                              borderColor: `${rarityCol}40`,
                            }}
                          >
                            {s.rarity}
                          </span>
                          <span style={styles.depthPill}>
                            {s.depthRange[0]}m – {s.depthRange[1]}m
                          </span>
                          <span style={styles.statusPill}>
                            {isDiscovered ? 'CATALOGUED' : 'UNRECORDED'}
                          </span>
                        </div>

                        <h3 style={styles.cardTitle}>
                          {isDiscovered ? s.name : 'Uncatalogued Specimen'}
                        </h3>
                        <p style={styles.scientificName}>
                          {isDiscovered ? s.scientificName : `[ Zone: ${s.primaryBiome} ]`}
                        </p>

                        {!isDiscovered && (
                          <p style={styles.cardHint}>
                            ◈ Field Clue: {s.discoveryHint}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SCIENTIFIC SPECIES DOSSIER VIEW */}
          {activeTab === 'species' && selectedSpecies && (
            <div style={styles.dossierContainer}>
              <button
                onClick={() => setSelectedSpecies(null)}
                style={styles.backBtn}
              >
                ← Return to Marine Fauna Archive
              </button>

              <div style={styles.dossierCard}>
                <div style={styles.dossierLeft}>
                  <div style={styles.dossierImageFrame}>
                    <div style={styles.reticleTopLeft} />
                    <div style={styles.reticleBottomRight} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedSpecies.texturePath}
                      alt={selectedSpecies.name}
                      style={styles.dossierImg}
                    />
                    <div style={styles.specimenScanLabel}>
                      [ SPECIMEN RECONSTRUCTION: FULL TAXONOMIC FIDELITY ]
                    </div>
                  </div>

                  <div style={styles.specBox}>
                    <div style={styles.specItem}>
                      <span style={styles.specLabel}>HABITAT BIOME</span>
                      <span style={styles.specValue}>{selectedSpecies.primaryBiome}</span>
                    </div>
                    <div style={styles.specItem}>
                      <span style={styles.specLabel}>BATHYMETRIC DEPTH BRACKET</span>
                      <span style={styles.specValue}>
                        {selectedSpecies.depthRange[0]}m – {selectedSpecies.depthRange[1]}m
                      </span>
                    </div>
                    <div style={styles.specItem}>
                      <span style={styles.specLabel}>LOCOMOTION & ETHOLOGY</span>
                      <span style={styles.specValue}>
                        {selectedSpecies.behavior.toUpperCase()}
                      </span>
                    </div>
                    <div style={styles.specItem}>
                      <span style={styles.specLabel}>SURVEY HORIZONTAL EXTENT</span>
                      <span style={styles.specValue}>
                        X: {selectedSpecies.worldXRange[0]} to {selectedSpecies.worldXRange[1]}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={styles.dossierRight}>
                  <div style={styles.dossierHeader}>
                    <div style={styles.pillRow}>
                      <span
                        style={{
                          ...styles.rarityPill,
                          backgroundColor: `${getRarityColor(selectedSpecies.rarity)}18`,
                          color: getRarityColor(selectedSpecies.rarity),
                          borderColor: `${getRarityColor(selectedSpecies.rarity)}40`,
                        }}
                      >
                        {selectedSpecies.rarity}
                      </span>
                      <span style={styles.statusPillCatalogued}>
                        VERIFIED DISCOVERY
                      </span>
                    </div>
                    <h3 style={styles.dossierTitle}>{selectedSpecies.name}</h3>
                    <p style={styles.dossierBinomial}>{selectedSpecies.scientificName}</p>
                  </div>

                  <div style={styles.sectionBlock}>
                    <h4 style={styles.sectionHeading}>MORPHOLOGICAL & TAXONOMIC DESCRIPTION</h4>
                    <p style={styles.loreText}>{selectedSpecies.description}</p>
                  </div>

                  <div style={styles.sectionBlock}>
                    <h4 style={styles.sectionHeading}>SUBMERSIBLE FIELD OBSERVATION LOG</h4>
                    <div style={styles.fieldNotesCard}>
                      <p style={styles.fieldNotesText}>&ldquo;{selectedSpecies.fieldNotes}&rdquo;</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GEOLOGICAL SURVEY LANDMARKS */}
          {activeTab === 'landmarks' && (
            <div style={styles.gridWide}>
              {LANDMARK_CATALOG.map((lm) => {
                const isDiscovered = journalManager.isLandmarkDiscovered(lm.id);

                return (
                  <div
                    key={lm.id}
                    style={{
                      ...styles.landmarkCard,
                      borderColor: isDiscovered ? 'rgba(56, 189, 248, 0.28)' : 'rgba(56, 189, 248, 0.08)',
                    }}
                  >
                    <div style={styles.landmarkIconCol}>
                      <span style={styles.landmarkEmoji}>
                        {isDiscovered ? '🏛️' : '◈'}
                      </span>
                    </div>

                    <div style={styles.landmarkInfo}>
                      <div style={styles.pillRow}>
                        <span style={styles.biomePill}>{lm.primaryBiome}</span>
                        <span style={styles.coordsPill}>
                          Coord: X={lm.worldPosition.x} • Depth: {Math.round(-lm.worldPosition.y * 3.6)}m
                        </span>
                        <span style={styles.statusPill}>
                          {isDiscovered ? 'SURVEYED' : 'UNEXPLORED'}
                        </span>
                      </div>

                      <h3 style={styles.landmarkTitle}>
                        {isDiscovered ? lm.name : 'Unsurveyed Geological Landmark'}
                      </h3>

                      <p style={styles.landmarkDesc}>
                        {isDiscovered
                          ? lm.description
                          : `Geological formation detected near ${lm.primaryBiome} at approximately ${Math.round(-lm.worldPosition.y * 3.6)}m depth.`}
                      </p>

                      {isDiscovered && (
                        <div style={styles.historyBox}>
                          <span style={styles.historyLabel}>HISTORICAL SURVEY RECORD</span>
                          <p style={styles.historyText}>{lm.historicalNote}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: SALVAGED RELICS & ARTIFACTS */}
          {activeTab === 'artifacts' && !selectedArtifact && (
            <div style={styles.grid}>
              {ARTIFACT_CATALOG.map((art) => {
                const isDiscovered = journalManager.isArtifactDiscovered(art.id);

                return (
                  <div
                    key={art.id}
                    onClick={() => isDiscovered && setSelectedArtifact(art)}
                    style={{
                      ...styles.card,
                      cursor: isDiscovered ? 'pointer' : 'default',
                      borderColor: isDiscovered ? 'rgba(245, 158, 11, 0.35)' : 'rgba(56, 189, 248, 0.08)',
                    }}
                    title={isDiscovered ? 'Click to inspect archaeological dossier' : art.hint}
                  >
                    <div style={styles.cardImageWrapper}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={art.texturePath}
                        alt={isDiscovered ? art.title : 'Undiscovered artifact'}
                        style={{
                          ...styles.cardImg,
                          filter: isDiscovered
                            ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))'
                            : 'brightness(0) drop-shadow(0 0 1px rgba(245, 158, 11, 0.25))',
                          opacity: isDiscovered ? 1 : 0.30,
                        }}
                      />
                      {!isDiscovered && (
                        <div style={styles.mysteryOverlay}>
                          <span style={styles.mysteryCode}>?</span>
                        </div>
                      )}
                    </div>

                    <div style={styles.cardBody}>
                      <div style={styles.pillRow}>
                        <span style={styles.categoryPill}>{art.category}</span>
                        <span style={styles.depthPill}>{art.primaryBiome}</span>
                      </div>

                      <h3 style={styles.cardTitle}>
                        {isDiscovered ? art.title : 'Unsalvaged Submerged Relic'}
                      </h3>

                      <p style={styles.cardHint}>
                        {isDiscovered
                          ? art.description
                          : `◈ Salvage Clue: ${art.hint}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* RELIC DOSSIER VIEW */}
          {activeTab === 'artifacts' && selectedArtifact && (
            <div style={styles.dossierContainer}>
              <button
                onClick={() => setSelectedArtifact(null)}
                style={styles.backBtn}
              >
                ← Return to Relics Catalog
              </button>

              <div style={styles.dossierCard}>
                <div style={styles.dossierLeft}>
                  <div style={styles.dossierImageFrame}>
                    <div style={styles.reticleTopLeft} />
                    <div style={styles.reticleBottomRight} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedArtifact.texturePath}
                      alt={selectedArtifact.title}
                      style={styles.dossierImg}
                    />
                    <div style={styles.specimenScanLabel}>
                      [ ARTIFACT AUTHENTICATION: VERIFIED SALVAGE ]
                    </div>
                  </div>

                  <div style={styles.specBox}>
                    <div style={styles.specItem}>
                      <span style={styles.specLabel}>ARCHAEOLOGICAL CLASS</span>
                      <span style={styles.specValue}>{selectedArtifact.category}</span>
                    </div>
                    <div style={styles.specItem}>
                      <span style={styles.specLabel}>RECOVERY BIOME</span>
                      <span style={styles.specValue}>{selectedArtifact.primaryBiome}</span>
                    </div>
                    <div style={styles.specItem}>
                      <span style={styles.specLabel}>ESTIMATED RECOVERY DEPTH</span>
                      <span style={styles.specValue}>
                        {Math.round(-selectedArtifact.worldPosition.y * 3.6)} meters
                      </span>
                    </div>
                  </div>
                </div>

                <div style={styles.dossierRight}>
                  <div style={styles.dossierHeader}>
                    <span style={styles.categoryPill}>{selectedArtifact.category}</span>
                    <h3 style={styles.dossierTitle}>{selectedArtifact.title}</h3>
                  </div>

                  <div style={styles.sectionBlock}>
                    <h4 style={styles.sectionHeading}>ARCHAEOLOGICAL OVERVIEW</h4>
                    <p style={styles.loreText}>{selectedArtifact.description}</p>
                  </div>

                  <div style={styles.sectionBlock}>
                    <h4 style={styles.sectionHeading}>HISTORICAL PROVENANCE</h4>
                    <div style={styles.fieldNotesCard}>
                      <p style={styles.fieldNotesText}>{selectedArtifact.lore}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BATHYMETRY & TELEMETRY */}
          {activeTab === 'map' && (
            <div style={styles.mapContainer}>
              {/* Left Column: Visual Ocean Depth Column */}
              <div style={styles.depthChart}>
                <div style={styles.sectionHeaderLine}>
                  <span style={styles.chartTitle}>OCEANIC BATHYMETRIC PROFILE</span>
                  <span style={styles.chartSubtitle}>SECTOR HYDROGRAPHY</span>
                </div>

                <div style={styles.columnContainer}>
                  {biomesList.map((biome, idx) => {
                    const depthLabels = [
                      '0m - 25m',
                      '25m - 90m',
                      '90m - 215m',
                      '215m - 325m',
                      '325m - 400m+',
                    ];
                    const bgGradients = [
                      'linear-gradient(180deg, rgba(56, 189, 248, 0.25) 0%, rgba(2, 132, 199, 0.3) 100%)',
                      'linear-gradient(180deg, rgba(2, 132, 199, 0.3) 0%, rgba(3, 105, 161, 0.35) 100%)',
                      'linear-gradient(180deg, rgba(3, 105, 161, 0.35) 0%, rgba(15, 23, 42, 0.6) 100%)',
                      'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(7, 14, 27, 0.8) 100%)',
                      'linear-gradient(180deg, rgba(7, 14, 27, 0.8) 0%, rgba(2, 6, 23, 0.95) 100%)',
                    ];
                    const isCurrent =
                      (idx === 0 && currentDepthMeters < 25) ||
                      (idx === 1 && currentDepthMeters >= 25 && currentDepthMeters < 90) ||
                      (idx === 2 && currentDepthMeters >= 90 && currentDepthMeters < 215) ||
                      (idx === 3 && currentDepthMeters >= 215 && currentDepthMeters < 325) ||
                      (idx === 4 && currentDepthMeters >= 325);

                    return (
                      <div
                        key={biome}
                        style={{
                          ...styles.biomeBand,
                          background: bgGradients[idx],
                          borderLeft: isCurrent ? '3px solid #38bdf8' : '3px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <div style={styles.biomeBandHeader}>
                          <span style={styles.biomeBandName}>{biome}</span>
                          <span style={styles.biomeBandDepth}>{depthLabels[idx]}</span>
                        </div>

                        {isCurrent && (
                          <div style={styles.currentDiverMarker}>
                            <span style={styles.diverPin}>◈ DIVER TELEMETRY: {currentDepthMeters}m</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Lifetime Stats & Persistence */}
              <div style={styles.statsPanel}>
                <div style={styles.sectionHeaderLine}>
                  <span style={styles.chartTitle}>EXPEDITION TELEMETRY & PERSISTENCE</span>
                  <span style={styles.chartSubtitle}>SESSION LOG</span>
                </div>

                {/* Launch Interactive World Map Button */}
                <div style={{ marginBottom: 14 }}>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenMap?.();
                    }}
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      backgroundColor: 'rgba(0, 194, 199, 0.22)',
                      border: '1.5px solid #00c2c7',
                      borderRadius: 12,
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 18px rgba(0, 194, 199, 0.3)',
                    }}
                  >
                    🗺️ Open Full Interactive Subterranean Atlas (M)
                  </button>
                </div>

                <div style={styles.statsCardGrid}>
                  <div style={styles.statMetricCard}>
                    <span style={styles.metricLabel}>TOTAL DISTANCE SWUM</span>
                    <span style={styles.metricVal}>{stats.totalDistanceSwum} m</span>
                  </div>

                  <div style={styles.statMetricCard}>
                    <span style={styles.metricLabel}>MAX DEPTH REACHED</span>
                    <span style={styles.metricVal}>{stats.maxDepthReached} m</span>
                  </div>

                  <div style={styles.statMetricCard}>
                    <span style={styles.metricLabel}>CAVE ENTRANCES LOGGED</span>
                    <span style={styles.metricVal}>
                      {stats.foundEntrances} / 17
                    </span>
                  </div>

                  <div style={styles.statMetricCard}>
                    <span style={styles.metricLabel}>WORLD MAP EXPLORATION</span>
                    <span style={styles.metricVal}>
                      {stats.mapExploredPercent}%
                    </span>
                  </div>

                  <div style={styles.statMetricCard}>
                    <span style={styles.metricLabel}>COMPANION STATUS</span>
                    <span style={styles.metricVal}>
                      {stats.companionRescued ? '◈ Rescued & Active' : '🕸️ Trapped in Net (Twilight Reef)'}
                    </span>
                  </div>

                  <div style={styles.statMetricCard}>
                    <span style={styles.metricLabel}>BIOMES SURVEYED</span>
                    <span style={styles.metricVal}>
                      {stats.visitedBiomes} / {stats.totalBiomes}
                    </span>
                  </div>
                </div>

                {/* Reset Progress Section */}
                <div style={styles.resetSection}>
                  <h5 style={styles.resetTitle}>DATA PERSISTENCE & STORAGE</h5>
                  <p style={styles.resetText}>
                    All discovered species, landmarks, salvaged relics, and companion bonds are stored locally in your browser storage.
                  </p>

                  {!confirmReset ? (
                    <button
                      onClick={() => setConfirmReset(true)}
                      style={styles.resetBtn}
                    >
                      Reset All Journal Progress
                    </button>
                  ) : (
                    <div style={styles.confirmBox}>
                      <p style={styles.confirmWarning}>
                        ⚠️ Confirm wipe: all field notes, species records, and companion status will be erased.
                      </p>
                      <div style={styles.confirmBtnRow}>
                        <button
                          onClick={handleResetData}
                          style={styles.confirmDeleteBtn}
                        >
                          Confirm Reset
                        </button>
                        <button
                          onClick={() => setConfirmReset(false)}
                          style={styles.cancelBtn}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9000,
    backgroundColor: 'rgba(2, 6, 18, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  modal: {
    width: '100%',
    maxWidth: '1060px',
    height: '88vh',
    backgroundColor: 'rgba(5, 11, 24, 0.96)',
    border: '1px solid rgba(56, 189, 248, 0.22)',
    borderRadius: '16px',
    boxShadow: '0 32px 80px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(56, 189, 248, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    padding: '18px 26px',
    borderBottom: '1px solid rgba(56, 189, 248, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
  },
  headerTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerIconWrapper: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    background: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: '20px',
    color: '#38bdf8',
  },
  headerKicker: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: '#38bdf8',
    marginBottom: '2px',
  },
  headerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '-0.01em',
  },
  headerSubtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
    display: 'block',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  progressBarWrapper: {
    width: '150px',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '3px',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: '3px',
    boxShadow: '0 0 8px rgba(56, 189, 248, 0.6)',
    transition: 'width 0.4s ease',
  },
  closeBtn: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#cbd5e1',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    transition: 'all 0.15s ease',
  },
  tabNav: {
    display: 'flex',
    padding: '8px 24px',
    gap: '8px',
    borderBottom: '1px solid rgba(56, 189, 248, 0.10)',
    backgroundColor: 'rgba(3, 7, 18, 0.5)',
    overflowX: 'auto',
  },
  tabBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid transparent',
    color: '#94a3b8',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    whiteSpace: 'nowrap',
  },
  tabBtnActive: {
    background: 'rgba(56, 189, 248, 0.10)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    color: '#38bdf8',
  },
  contentArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 26px',
  },
  filterBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  filterBtn: {
    padding: '5px 12px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#94a3b8',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  filterBtnActive: {
    background: 'rgba(56, 189, 248, 0.16)',
    borderColor: '#38bdf8',
    color: '#38bdf8',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
    gap: '16px',
  },
  gridWide: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'rgba(8, 17, 34, 0.72)',
    border: '1px solid rgba(56, 189, 248, 0.12)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    gap: '14px',
    alignItems: 'center',
    transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
  },
  cardImageWrapper: {
    width: '80px',
    height: '80px',
    borderRadius: '10px',
    background: 'radial-gradient(circle, rgba(14, 30, 52, 0.8) 0%, rgba(3, 7, 18, 0.95) 80%)',
    border: '1px solid rgba(56, 189, 248, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  cardImg: {
    maxWidth: '68px',
    maxHeight: '68px',
    objectFit: 'contain',
  },
  mysteryOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mysteryCode: {
    fontSize: '22px',
    fontWeight: 800,
    color: 'rgba(56, 189, 248, 0.35)',
    fontFamily: 'monospace',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  pillRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '6px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  rarityPill: {
    fontSize: '9px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid transparent',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  depthPill: {
    fontSize: '9px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#94a3b8',
    letterSpacing: '0.04em',
    fontFamily: 'monospace',
  },
  statusPill: {
    fontSize: '8px',
    fontWeight: 700,
    padding: '2px 5px',
    borderRadius: '4px',
    background: 'rgba(148, 163, 184, 0.1)',
    color: '#64748b',
    letterSpacing: '0.06em',
  },
  statusPillCatalogued: {
    fontSize: '9px',
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: '4px',
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    letterSpacing: '0.06em',
    border: '1px solid rgba(56, 189, 248, 0.3)',
  },
  biomePill: {
    fontSize: '9px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    background: 'rgba(56, 189, 248, 0.08)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.2)',
  },
  categoryPill: {
    fontSize: '9px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    background: 'rgba(245, 158, 11, 0.12)',
    color: '#f59e0b',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  coordsPill: {
    fontSize: '9px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  cardTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 700,
    color: '#f8fafc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  scientificName: {
    margin: '2px 0 0 0',
    fontSize: '11px',
    color: '#7dd3fc',
    fontStyle: 'italic',
  },
  cardHint: {
    margin: '6px 0 0 0',
    fontSize: '11px',
    color: '#64748b',
    lineHeight: '1.4',
  },
  dossierContainer: {
    maxWidth: '860px',
    margin: '0 auto',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: '#38bdf8',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    marginBottom: '16px',
    padding: 0,
  },
  dossierCard: {
    background: 'rgba(8, 17, 34, 0.85)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: '14px',
    padding: '28px',
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
  },
  dossierLeft: {
    width: '280px',
    flexShrink: 0,
  },
  dossierImageFrame: {
    width: '100%',
    height: '220px',
    background: 'radial-gradient(circle, rgba(14, 34, 60, 0.7) 0%, rgba(3, 7, 18, 0.95) 85%)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    position: 'relative',
  },
  reticleTopLeft: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    width: '12px',
    height: '12px',
    borderTop: '2px solid rgba(56, 189, 248, 0.4)',
    borderLeft: '2px solid rgba(56, 189, 248, 0.4)',
  },
  reticleBottomRight: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    width: '12px',
    height: '12px',
    borderBottom: '2px solid rgba(56, 189, 248, 0.4)',
    borderRight: '2px solid rgba(56, 189, 248, 0.4)',
  },
  dossierImg: {
    maxWidth: '190px',
    maxHeight: '160px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.75))',
  },
  specimenScanLabel: {
    fontSize: '8px',
    fontFamily: 'monospace',
    color: '#64748b',
    marginTop: '6px',
    letterSpacing: '0.04em',
  },
  specBox: {
    background: 'rgba(0, 0, 0, 0.35)',
    border: '1px solid rgba(56, 189, 248, 0.1)',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  specItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  specLabel: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '0.08em',
  },
  specValue: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  dossierRight: {
    flex: 1,
    minWidth: '280px',
  },
  dossierHeader: {
    borderBottom: '1px solid rgba(56, 189, 248, 0.12)',
    paddingBottom: '14px',
    marginBottom: '18px',
  },
  dossierTitle: {
    margin: '8px 0 2px 0',
    fontSize: '24px',
    fontWeight: 800,
    color: '#f8fafc',
    letterSpacing: '-0.01em',
  },
  dossierBinomial: {
    margin: 0,
    fontSize: '14px',
    color: '#38bdf8',
    fontStyle: 'italic',
  },
  sectionBlock: {
    marginBottom: '20px',
  },
  sectionHeading: {
    margin: '0 0 6px 0',
    fontSize: '10px',
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.08em',
  },
  loreText: {
    margin: 0,
    fontSize: '13px',
    lineHeight: '1.65',
    color: '#cbd5e1',
  },
  fieldNotesCard: {
    background: 'rgba(56, 189, 248, 0.05)',
    borderLeft: '3px solid #38bdf8',
    borderRadius: '0 8px 8px 0',
    padding: '12px 16px',
  },
  fieldNotesText: {
    margin: 0,
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  landmarkCard: {
    background: 'rgba(8, 17, 34, 0.72)',
    border: '1px solid rgba(56, 189, 248, 0.12)',
    borderRadius: '12px',
    padding: '18px',
    display: 'flex',
    gap: '16px',
  },
  landmarkIconCol: {
    width: '44px',
    height: '44px',
    borderRadius: '8px',
    background: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  landmarkEmoji: {
    fontSize: '20px',
  },
  landmarkInfo: {
    flex: 1,
  },
  landmarkTitle: {
    margin: '0 0 6px 0',
    fontSize: '15px',
    fontWeight: 700,
    color: '#f8fafc',
  },
  landmarkDesc: {
    margin: 0,
    fontSize: '12px',
    lineHeight: '1.5',
    color: '#94a3b8',
  },
  historyBox: {
    marginTop: '12px',
    background: 'rgba(0, 0, 0, 0.3)',
    padding: '10px 14px',
    borderRadius: '6px',
    borderLeft: '2px solid #38bdf8',
  },
  historyLabel: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#38bdf8',
    letterSpacing: '0.08em',
    display: 'block',
    marginBottom: '2px',
  },
  historyText: {
    margin: 0,
    fontSize: '12px',
    color: '#cbd5e1',
    lineHeight: '1.45',
  },
  mapContainer: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  depthChart: {
    flex: '1 1 340px',
  },
  statsPanel: {
    flex: '1 1 360px',
  },
  sectionHeaderLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    borderBottom: '1px solid rgba(56, 189, 248, 0.1)',
    paddingBottom: '6px',
  },
  chartTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#e2e8f0',
    letterSpacing: '0.08em',
  },
  chartSubtitle: {
    fontSize: '9px',
    fontFamily: 'monospace',
    color: '#64748b',
    letterSpacing: '0.06em',
  },
  columnContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  biomeBand: {
    padding: '16px 20px',
    position: 'relative',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  },
  biomeBandHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  biomeBandName: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#ffffff',
  },
  biomeBandDepth: {
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'monospace',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  currentDiverMarker: {
    marginTop: '8px',
    display: 'inline-block',
  },
  diverPin: {
    fontSize: '10px',
    fontWeight: 700,
    fontFamily: 'monospace',
    background: '#38bdf8',
    color: '#020617',
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.04em',
  },
  statsCardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '20px',
  },
  statMetricCard: {
    background: 'rgba(8, 17, 34, 0.75)',
    border: '1px solid rgba(56, 189, 248, 0.12)',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metricLabel: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '0.08em',
  },
  metricVal: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#f8fafc',
    fontFamily: 'monospace',
  },
  resetSection: {
    background: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '10px',
    padding: '16px',
  },
  resetTitle: {
    margin: '0 0 4px 0',
    fontSize: '11px',
    fontWeight: 700,
    color: '#f87171',
    letterSpacing: '0.08em',
  },
  resetText: {
    margin: '0 0 12px 0',
    fontSize: '11px',
    color: '#94a3b8',
    lineHeight: '1.45',
  },
  resetBtn: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: '#fca5a5',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  confirmBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  confirmWarning: {
    margin: 0,
    fontSize: '11px',
    color: '#f87171',
  },
  confirmBtnRow: {
    display: 'flex',
    gap: '10px',
  },
  confirmDeleteBtn: {
    background: '#dc2626',
    border: 'none',
    color: '#ffffff',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  cancelBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    color: '#cbd5e1',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
