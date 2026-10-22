'use client';

import React, { useEffect, useState } from 'react';
import { journalManager, DiscoveryEvent } from '@/game/JournalManager';
import { getRarityColor, CreatureRarity } from '@/game/speciesData';

export default function DiscoveryNotification() {
  const [currentEvent, setCurrentEvent] = useState<DiscoveryEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const queue: DiscoveryEvent[] = [];
    let isShowing = false;

    const showNext = () => {
      if (queue.length === 0) {
        isShowing = false;
        setVisible(false);
        setTimeout(() => setCurrentEvent(null), 300);
        return;
      }
      isShowing = true;
      const next = queue.shift()!;
      setCurrentEvent(next);
      setVisible(true);

      setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          showNext();
        }, 350);
      }, 4200);
    };

    const unsubscribe = journalManager.onDiscovery((evt) => {
      queue.push(evt);
      if (!isShowing) {
        showNext();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!currentEvent) return null;

  const getTypeLabel = (type: DiscoveryEvent['type']) => {
    switch (type) {
      case 'species': return 'NEW SPECIES LOGGED';
      case 'artifact': return 'ANCIENT RELIC SALVAGED';
      case 'landmark': return 'LANDMARK DISCOVERED';
      case 'biome': return 'NEW BIOME EXPLORED';
    }
  };

  const getTypeIcon = (type: DiscoveryEvent['type']) => {
    switch (type) {
      case 'species': return '🐠';
      case 'artifact': return '🏺';
      case 'landmark': return '🏛️';
      case 'biome': return '🌊';
    }
  };

  const rarityColor = currentEvent.rarity
    ? getRarityColor(currentEvent.rarity as CreatureRarity)
    : '#38bdf8';

  return (
    <div
      style={{
        ...styles.container,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-24px) scale(0.96)',
      }}
      role="alert"
      aria-live="polite"
    >
      <div style={{ ...styles.card, borderColor: rarityColor }}>
        {/* Glow accent */}
        <div
          style={{
            ...styles.accentBar,
            backgroundColor: rarityColor,
            boxShadow: `0 0 16px ${rarityColor}88`,
          }}
        />

        {/* Thumbnail icon or sprite */}
        <div style={styles.iconWrapper}>
          {currentEvent.iconPath ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={currentEvent.iconPath}
              alt=""
              style={styles.iconImg}
            />
          ) : (
            <span style={styles.emojiIcon}>{getTypeIcon(currentEvent.type)}</span>
          )}
        </div>

        {/* Text information */}
        <div style={styles.textContainer}>
          <div style={styles.headerRow}>
            <span style={{ ...styles.typeLabel, color: rarityColor }}>
              {getTypeLabel(currentEvent.type)}
            </span>
            <span style={styles.journalPrompt}>Press [J] to view</span>
          </div>

          <h4 style={styles.title}>{currentEvent.title}</h4>
          <p style={styles.subtitle}>{currentEvent.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: '72px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    pointerEvents: 'none',
    transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    maxWidth: '460px',
    width: 'calc(100vw - 32px)',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    background: 'rgba(10, 18, 34, 0.94)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    borderRadius: '14px',
    padding: '12px 18px',
    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '4px',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  iconImg: {
    maxWidth: '38px',
    maxHeight: '38px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
  },
  emojiIcon: {
    fontSize: '24px',
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },
  typeLabel: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  journalPrompt: {
    fontSize: '10px',
    color: '#94a3b8',
    opacity: 0.8,
  },
  title: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 700,
    color: '#f8fafc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '12px',
    color: '#cbd5e1',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

