'use client';

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { FrameCameraState } from '@/game/types';
import {
  PORTFOLIO_STATIONS,
  PortfolioStation,
  SkillItem,
} from '@/game/portfolioData';

declare global {
  interface Window {
    lottie?: {
      loadAnimation: (params: {
        container: HTMLElement;
        renderer: 'svg' | 'canvas' | 'html';
        loop: boolean;
        autoplay: boolean;
        path: string;
      }) => { destroy: () => void };
    };
  }
}

export interface PortfolioOverlayHandle {
  updateFrame: (frame: FrameCameraState) => void;
}

interface PortfolioOverlayProps {
  onNavigateTo: (x: number, y: number) => void;
}

interface ActiveJelly {
  id: string;
  el: HTMLDivElement;
  anim?: { destroy: () => void };
  level: number;
  wx: number;
  wy: number;
  vx: number;
  vy: number;
  phase: number;
  phaseSpeed: number;
  dragging: boolean;
  dragOffsetScreenX: number;
  dragOffsetScreenY: number;
  exiting: boolean;
  opacity: number;
}

const JELLY_SIZE = 120;
const MAX_JELLIES: Record<number, number> = { 0: 3, 1: 5, 2: 7 };
const TORCH_R: Record<number, number> = { 0: 145, 1: 190, 2: 260 };
const BRIGHTNESS = [1.0, 1.0, 1.0, 1.0, 0.5, 0.0];

function renderProjectIcon(iconType: string) {
  switch (iconType) {
    case 'radiology':
      return (
        <svg
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00d4ff"
          strokeWidth="1.3"
          style={{ position: 'relative', zIndex: 2 }}
        >
          <path d="M12 3v6M9 6h6M6 21h12a2 2 0 0 0 2-2v-3a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v3a2 2 0 0 0 2 2z" />
        </svg>
      );
    case 'expense':
      return (
        <svg
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00d4ff"
          strokeWidth="1.3"
          style={{ position: 'relative', zIndex: 2 }}
        >
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <path d="M2 10h20M6 15h4" />
          <circle cx="17" cy="15" r="1.6" />
        </svg>
      );
    case 'uno':
      return (
        <svg
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffe6d9"
          strokeWidth="1.3"
          style={{ position: 'relative', zIndex: 2 }}
        >
          <rect
            x="3"
            y="4"
            width="12"
            height="16"
            rx="2"
            transform="rotate(-8 9 12)"
          />
          <rect
            x="9"
            y="4"
            width="12"
            height="16"
            rx="2"
            transform="rotate(8 15 12)"
          />
        </svg>
      );
    case 'portfolio':
      return (
        <svg
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00d4ff"
          strokeWidth="1.3"
          style={{ position: 'relative', zIndex: 2 }}
        >
          <path d="M2 15q2.5-3 5-0t5-3 5 3 5-3" />
          <path d="M2 19q2.5-3 5-0t5-3 5 3 5-3" />
          <circle cx="12" cy="7" r="3.2" />
        </svg>
      );
    case 'database':
      return (
        <svg
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00d4ff"
          strokeWidth="1.3"
          style={{ position: 'relative', zIndex: 2 }}
        >
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
          <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
        </svg>
      );
    case 'cisco':
    default:
      return (
        <svg
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00d4ff"
          strokeWidth="1.3"
          style={{ position: 'relative', zIndex: 2 }}
        >
          <circle cx="12" cy="4" r="2.2" />
          <circle cx="4" cy="19" r="2.2" />
          <circle cx="20" cy="19" r="2.2" />
          <path d="M12 6.2V13M12 13L5.4 17.3M12 13l6.6 4.3" />
        </svg>
      );
  }
}

const PortfolioOverlaySystem = forwardRef<
  PortfolioOverlayHandle,
  PortfolioOverlayProps
>(function PortfolioOverlaySystem({ onNavigateTo }, ref) {
  const stationRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const jellyLayerRef = useRef<HTMLDivElement>(null);
  const darknessCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeJelliesRef = useRef<ActiveJelly[]>([]);
  const currentRadiusMapRef = useRef<Record<string, number>>({});
  const darknessOpacityRef = useRef(0);
  const lastSpawnCheckRef = useRef(0);
  const latestFrameRef = useRef<FrameCameraState>({
    camX: -18.3,
    camY: 1.0,
    viewWidth: 32,
    viewHeight: 18,
    diverX: -18.3,
    diverY: -2.0,
    diverFacing: 1,
    diverPitch: 0,
    beamOriginX: -17.5,
    beamOriginY: -2.0,
    beamDirX: 1,
    beamDirY: 0,
    companionX: null,
    companionY: null,
    companionActive: false,
    depthMeters: 0,
  });

  // Setup offscreen mask canvas & window resize listener for Darkness Canvas
  useEffect(() => {
    const mc = document.createElement('canvas');
    maskCanvasRef.current = mc;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (darknessCanvasRef.current) {
        darknessCanvasRef.current.width = w;
        darknessCanvasRef.current.height = h;
      }
      mc.width = w;
      mc.height = h;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      activeJelliesRef.current.forEach((j) => {
        j.anim?.destroy();
        j.el.remove();
      });
      activeJelliesRef.current = [];
    };
  }, []);

  /**
   * Computes continuous target darkness (0.00 to 0.97) from portfolio depth (0m to 1000m)
   * matching C:\xampp\htdocs\portfolio\js\config.js
   */
  const computeTargetDarkness = (depthMeters: number): number => {
    if (depthMeters <= 35) return 0.0;
    if (depthMeters <= 80) {
      return ((depthMeters - 35) / 45) * 0.1;
    }
    if (depthMeters <= 200) {
      return 0.1 + ((depthMeters - 80) / 120) * 0.42;
    }
    if (depthMeters <= 400) {
      return 0.52 + ((depthMeters - 200) / 200) * 0.32;
    }
    if (depthMeters <= 600) {
      return 0.84 + ((depthMeters - 400) / 200) * 0.13;
    }
    return 0.97;
  };

  /**
   * Determines jellyfish depth level (-1 = none, 0 = Skills ~110m+, 1 = Projects ~250m+, 2 = Hadal ~500m+)
   */
  const getJellyDepthLevel = (depthMeters: number): number => {
    if (depthMeters < 95) return -1;
    if (depthMeters < 240) return 0;
    if (depthMeters < 520) return 1;
    return 2;
  };

  /**
   * Spawns an interactive draggable Lottie Jellyfish (`lottie/jellyfish.json`) in world space
   */
  const spawnJellyfish = (level: number, frame: FrameCameraState) => {
    const layer = jellyLayerRef.current;
    if (!layer) return;

    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'jelly';
    wrapper.dataset.level = String(level);
    wrapper.dataset.id = id;
    wrapper.setAttribute('role', 'img');
    wrapper.setAttribute(
      'aria-label',
      'Bioluminescent Jellyfish — drag near content to illuminate the darkness'
    );

    if (window.lottie) {
      // Load the exact Lottie animation from C:\xampp\htdocs\portfolio\lottie\lottie.json
    }
    const anim = window.lottie?.loadAnimation({
      container: wrapper,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/lottie/jellyfish.json',
    });

    layer.appendChild(wrapper);

    // Spawn within or near the camera view in world coordinates
    const spreadX = (Math.random() - 0.5) * frame.viewWidth * 0.72;
    const spreadY = (Math.random() - 0.5) * frame.viewHeight * 0.65;

    const jelly: ActiveJelly = {
      id,
      el: wrapper,
      anim,
      level,
      wx: frame.camX + spreadX,
      wy: frame.camY + spreadY,
      vx: (Math.random() - 0.5) * 0.025,
      vy: 0.008 + Math.random() * 0.018,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.012 + Math.random() * 0.014,
      dragging: false,
      dragOffsetScreenX: 0,
      dragOffsetScreenY: 0,
      exiting: false,
      opacity: 0,
    };

    requestAnimationFrame(() => {
      wrapper.classList.add('visible');
      jelly.opacity = 1;
    });

    // Setup mouse & touch drag handlers (ported from portfolio/js/jellyfish.js)
    const onStart = (e: MouseEvent | TouchEvent) => {
      jelly.dragging = true;
      wrapper.classList.add('dragging');
      const pt = 'touches' in e ? e.touches[0] : e;
      const f = latestFrameRef.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const curScreenX = ((jelly.wx - f.camX) / (f.viewWidth / 2)) * (W / 2) + W / 2;
      const curScreenY = (-(jelly.wy - f.camY) / (f.viewHeight / 2)) * (H / 2) + H / 2;

      jelly.dragOffsetScreenX = pt.clientX - curScreenX;
      jelly.dragOffsetScreenY = pt.clientY - curScreenY;
      e.preventDefault();
      e.stopPropagation();
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!jelly.dragging) return;
      const pt = 'touches' in e ? e.touches[0] : e;
      const f = latestFrameRef.current;
      const W = window.innerWidth;
      const H = window.innerHeight;

      const targetScreenX = pt.clientX - jelly.dragOffsetScreenX;
      const targetScreenY = pt.clientY - jelly.dragOffsetScreenY;

      jelly.wx = f.camX + ((targetScreenX - W / 2) / (W / 2)) * (f.viewWidth / 2);
      jelly.wy = f.camY - ((targetScreenY - H / 2) / (H / 2)) * (f.viewHeight / 2);
      e.preventDefault();
    };

    const onEnd = () => {
      if (!jelly.dragging) return;
      jelly.dragging = false;
      wrapper.classList.remove('dragging');
      jelly.vx = (Math.random() - 0.5) * 0.02;
      jelly.vy = (Math.random() - 0.5) * 0.02;
    };

    wrapper.addEventListener('mousedown', onStart, { passive: false });
    wrapper.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);

    activeJelliesRef.current.push(jelly);
  };

  useImperativeHandle(ref, () => ({
    updateFrame: (frame: FrameCameraState) => {
      latestFrameRef.current = frame;
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (W === 0 || H === 0) return;

      const halfVW = frame.viewWidth / 2;
      const halfVH = frame.viewHeight / 2;
      const baseScale = Math.min(1.05, Math.max(0.62, H / 920));

      // ─────────────────────────────────────────────────────────────────────
      // 1. UPDATE WORLD-SPACE PORTFOLIO STATIONS
      // ─────────────────────────────────────────────────────────────────────
      for (let i = 0; i < PORTFOLIO_STATIONS.length; i++) {
        const st = PORTFOLIO_STATIONS[i];
        const el = stationRefs.current.get(st.id);
        if (!el) continue;

        const dx = st.worldX - frame.camX;
        const dy = st.worldY - frame.camY;

        // Cull stations far outside the camera frustum for performance
        if (Math.abs(dx) > halfVW + 16 || Math.abs(dy) > halfVH + 12) {
          if (el.style.display !== 'none') el.style.display = 'none';
          continue;
        }

        if (el.style.display !== 'block') el.style.display = 'block';

        const screenX = (dx / halfVW) * (W / 2) + W / 2;
        const screenY = (-dy / halfVH) * (H / 2) + H / 2;
        const cardScale = baseScale * (st.scale ?? 0.86);

        el.style.transform = `translate3d(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px, 0) translate(-50%, -50%) scale(${cardScale.toFixed(3)})`;
      }

      // ─────────────────────────────────────────────────────────────────────
      // 2. MANAGE & ANIMATE DRAGGABLE LOTTIE JELLYFISH
      // ─────────────────────────────────────────────────────────────────────
      const now = performance.now();
      const level = getJellyDepthLevel(frame.depthMeters);

      if (now - lastSpawnCheckRef.current > 1200) {
        lastSpawnCheckRef.current = now;
        if (level >= 0) {
          const maxJ = MAX_JELLIES[level] ?? 3;
          const activeCount = activeJelliesRef.current.filter(
            (j) => !j.exiting
          ).length;
          if (activeCount < maxJ) {
            const toSpawn = activeCount === 0 ? Math.min(2, maxJ) : 1;
            for (let s = 0; s < toSpawn; s++) {
              spawnJellyfish(level, frame);
            }
          }
          activeJelliesRef.current.forEach((j) => {
            j.level = level;
            j.el.dataset.level = String(level);
          });
        } else {
          // Diver returned to shallow sunlit waters: let jellies gracefully exit
          activeJelliesRef.current.forEach((j) => {
            if (!j.exiting) {
              j.exiting = true;
              j.dragging = false;
              j.el.classList.remove('visible');
              j.opacity = 0;
            }
          });
        }
      }

      const jellies = activeJelliesRef.current;
      for (let i = jellies.length - 1; i >= 0; i--) {
        const j = jellies[i];

        if (!j.dragging) {
          j.phase += j.phaseSpeed;
          const wobbleX = Math.sin(j.phase * 1.1) * 0.016;
          const wobbleY =
            Math.cos(j.phase * 0.85) * 0.011 + Math.sin(j.phase * 0.5) * 0.008;

          j.wx += j.vx + wobbleX;
          j.wy += j.vy + wobbleY;

          if (!j.exiting) {
            // Gentle pull toward current camera viewport so jellies stay accessible near the diver
            j.vx += (frame.camX - j.wx) * 0.00018;
            j.vy += (frame.camY - j.wy) * 0.00018;
            j.vx *= 0.992;
            j.vy *= 0.992;
          }
        }

        const jScreenX = ((j.wx - frame.camX) / halfVW) * (W / 2) + W / 2;
        const jScreenY = (-(j.wy - frame.camY) / halfVH) * (H / 2) + H / 2;

        const angle = j.dragging
          ? 0
          : Math.atan2(-j.vy, j.vx) * (180 / Math.PI) + 90;

        j.el.style.transform = `translate3d(${(jScreenX - JELLY_SIZE / 2).toFixed(1)}px, ${(jScreenY - JELLY_SIZE / 2).toFixed(1)}px, 0) rotate(${angle.toFixed(1)}deg)`;

        if (
          j.exiting &&
          (Math.abs(j.wx - frame.camX) > halfVW * 2.5 ||
            Math.abs(j.wy - frame.camY) > halfVH * 2.5 ||
            j.opacity === 0)
        ) {
          j.anim?.destroy();
          j.el.remove();
          jellies.splice(i, 1);
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // 3. DRAW PROGRESSIVE DEPTH DARKNESS & LIGHT MASKS (from portfolio/js/darkness.js)
      // ─────────────────────────────────────────────────────────────────────
      const cv = darknessCanvasRef.current;
      const mc = maskCanvasRef.current;
      if (!cv || !mc) return;

      const ctx = cv.getContext('2d');
      const mct = mc.getContext('2d');
      if (!ctx || !mct) return;

      const targetDarkness = computeTargetDarkness(frame.depthMeters);
      darknessOpacityRef.current +=
        (targetDarkness - darknessOpacityRef.current) * 0.08;
      if (Math.abs(targetDarkness - darknessOpacityRef.current) < 0.003) {
        darknessOpacityRef.current = targetDarkness;
      }

      const opacity = darknessOpacityRef.current;
      ctx.clearRect(0, 0, W, H);
      if (opacity < 0.01) return;

      // Fill viewport with depth darkness
      ctx.globalAlpha = opacity;
      ctx.fillStyle = 'rgb(0, 3, 8)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      // Prepare light mask on offscreen canvas
      mct.clearRect(0, 0, W, H);

      const pxPerUnitX = W / frame.viewWidth;
      const pxPerUnitY = H / frame.viewHeight;
      const pxPerUnit = (pxPerUnitX + pxPerUnitY) * 0.5;

      // 3A. Cut light holes for every active Lottie Jellyfish (matching portfolio/js/darkness.js)
      for (let i = 0; i < jellies.length; i++) {
        const j = jellies[i];
        if (j.exiting) continue;

        const jx = ((j.wx - frame.camX) / halfVW) * (W / 2) + W / 2;
        const jy = (-(j.wy - frame.camY) / halfVH) * (H / 2) + H / 2;

        const targetR = TORCH_R[j.level] || 180;
        const curMap = currentRadiusMapRef.current;
        if (curMap[j.id] === undefined) curMap[j.id] = targetR * 0.4;
        curMap[j.id] += (targetR - curMap[j.id]) * 0.08;
        const r = curMap[j.id];

        const g = mct.createRadialGradient(jx, jy, 0, jx, jy, r);
        g.addColorStop(0.0, `rgba(255,255,255,${BRIGHTNESS[0]})`);
        g.addColorStop(0.25, `rgba(255,255,255,${BRIGHTNESS[1]})`);
        g.addColorStop(0.48, `rgba(255,255,255,${BRIGHTNESS[2]})`);
        g.addColorStop(0.63, `rgba(255,255,255,${BRIGHTNESS[3]})`);
        g.addColorStop(0.84, `rgba(255,255,255,${BRIGHTNESS[4]})`);
        g.addColorStop(1.0, `rgba(255,255,255,${BRIGHTNESS[5]})`);
        mct.fillStyle = g;
        mct.beginPath();
        mct.arc(jx, jy, r, 0, Math.PI * 2);
        mct.fill();
      }

      // 3B. Cut light hole for the Diver's Ambient Halo + Conical Flashlight Beam
      const diverScreenX =
        ((frame.diverX - frame.camX) / halfVW) * (W / 2) + W / 2;
      const diverScreenY =
        (-(frame.diverY - frame.camY) / halfVH) * (H / 2) + H / 2;

      const diverHaloR = 3.2 * pxPerUnit;
      const dg = mct.createRadialGradient(
        diverScreenX,
        diverScreenY,
        0,
        diverScreenX,
        diverScreenY,
        diverHaloR
      );
      dg.addColorStop(0.0, 'rgba(255,255,255,0.96)');
      dg.addColorStop(0.45, 'rgba(255,255,255,0.75)');
      dg.addColorStop(0.8, 'rgba(255,255,255,0.28)');
      dg.addColorStop(1.0, 'rgba(255,255,255,0.0)');
      mct.fillStyle = dg;
      mct.beginPath();
      mct.arc(diverScreenX, diverScreenY, diverHaloR, 0, Math.PI * 2);
      mct.fill();

      // Conical Flashlight Beam projection
      const lensX =
        ((frame.beamOriginX - frame.camX) / halfVW) * (W / 2) + W / 2;
      const lensY =
        (-(frame.beamOriginY - frame.camY) / halfVH) * (H / 2) + H / 2;
      const beamLenPx = 9.8 * pxPerUnit;
      const screenAngle = Math.atan2(-frame.beamDirY, frame.beamDirX);
      const halfConeAngle = 0.36;

      mct.save();
      mct.translate(lensX, lensY);
      mct.rotate(screenAngle);

      const bg = mct.createRadialGradient(0, 0, 4, 0, 0, beamLenPx);
      bg.addColorStop(0.0, 'rgba(255,255,255,1.0)');
      bg.addColorStop(0.35, 'rgba(255,255,255,0.92)');
      bg.addColorStop(0.7, 'rgba(255,255,255,0.55)');
      bg.addColorStop(1.0, 'rgba(255,255,255,0.0)');
      mct.fillStyle = bg;
      mct.beginPath();
      mct.moveTo(0, 0);
      mct.arc(0, 0, beamLenPx, -halfConeAngle, halfConeAngle);
      mct.closePath();
      mct.fill();
      mct.restore();

      // 3C. Cut light hole for Rescued Companion Lumi (if active)
      if (
        frame.companionActive &&
        frame.companionX !== null &&
        frame.companionY !== null
      ) {
        const compScreenX =
          ((frame.companionX - frame.camX) / halfVW) * (W / 2) + W / 2;
        const compScreenY =
          (-(frame.companionY - frame.camY) / halfVH) * (H / 2) + H / 2;
        const compR = 3.8 * pxPerUnit;
        const cg = mct.createRadialGradient(
          compScreenX,
          compScreenY,
          0,
          compScreenX,
          compScreenY,
          compR
        );
        cg.addColorStop(0.0, 'rgba(255,255,255,0.95)');
        cg.addColorStop(0.55, 'rgba(255,255,255,0.65)');
        cg.addColorStop(1.0, 'rgba(255,255,255,0.0)');
        mct.fillStyle = cg;
        mct.beginPath();
        mct.arc(compScreenX, compScreenY, compR, 0, Math.PI * 2);
        mct.fill();
      }

      // Punch out illuminated regions from the darkness layer
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(mc, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    },
  }));

  const renderStationContent = (st: PortfolioStation) => {
    const d = st.data;

    switch (st.type) {
      case 'hero':
        return (
          <div className="pf-hero-inner">
            <span className="pf-hero-badge">{st.depthBadge}</span>
            <h1 className="pf-hero-name">
              <span className="pf-name-line">{String(d.firstName)}</span>
              <span className="pf-name-line">{String(d.lastName)}</span>
            </h1>
            <p className="pf-hero-title">{String(d.role)}</p>
            <p className="pf-hero-tagline">{String(d.tagline)}</p>
            <div className="pf-hero-actions">
              <button
                type="button"
                className="pf-btn pf-btn-primary"
                onClick={() => onNavigateTo(-27.0, -19.5)}
              >
                Begin the dive
              </button>
              <button
                type="button"
                className="pf-btn pf-btn-ghost"
                onClick={() => onNavigateTo(-3.0, -67.0)}
              >
                View projects
              </button>
            </div>
            <div className="pf-scroll-cue">
              <span>Swim down to dive (S / ↓)</span>
              <div className="pf-scroll-chevron">
                <div />
                <div />
              </div>
            </div>
          </div>
        );

      case 'about_bio': {
        const stats =
          (d.stats as { num: string; label: string }[]) || [];
        return (
          <div>
            <header className="pf-section-header">
              <span className="pf-depth-badge">{st.depthBadge}</span>
              <h2 className="pf-section-title">About Me</h2>
            </header>
            <div className="pf-about-bio-card pf-glass-panel">
              <p className="pf-about-intro">
                Hey, I&apos;m <strong>Abhishek</strong> — a Bachelor of IT
                student who builds things that breathe.
              </p>
              <p className="pf-about-p">{String(d.p1)}</p>
              <p className="pf-about-p">{String(d.p2)}</p>
              <div className="pf-stats-row">
                {stats.map((s) => (
                  <div key={s.label} className="pf-stat">
                    <span className="pf-stat-n">{s.num}</span>
                    <span className="pf-stat-l">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'about_avatar': {
        const facts = (d.facts as { k: string; v: string }[]) || [];
        return (
          <div>
            <header className="pf-section-header">
              <span className="pf-depth-badge">{st.depthBadge}</span>
              <h2 className="pf-section-title" style={{ fontSize: '1.65rem' }}>
                Explorer Profile
              </h2>
            </header>
            <div className="pf-about-avatar-card pf-glass-panel">
              <div className="pf-avatar-wrap">
                <div className="pf-avatar-ring-outer" />
                <div className="pf-avatar-ring-inner" />
                <div className="pf-avatar-core">
                  <svg
                    viewBox="0 0 100 100"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-label="Abhishek Ghimire avatar"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="rgba(0,30,50,0.6)"
                      stroke="rgba(0,212,255,0.4)"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M50 18 C36 18 28 28 28 42 C28 54 34 60 50 60 C66 60 72 54 72 42 C72 28 64 18 50 18 Z"
                      fill="rgba(18,45,66,0.85)"
                      stroke="rgba(0,212,255,0.5)"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M34 36 C34 32 38 30 50 30 C62 30 66 32 66 36 L64 45 C64 48 60 50 50 50 C40 50 36 48 36 45 Z"
                      fill="rgba(0,212,255,0.25)"
                      stroke="#00d4ff"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M40 34 L44 42 M56 34 L60 42"
                      stroke="rgba(255,255,255,0.6)"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="50"
                      cy="55"
                      r="4.5"
                      fill="#142e44"
                      stroke="#ff6b35"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M22 88 C24 72 34 66 50 66 C66 66 76 72 78 88"
                      fill="rgba(14,35,52,0.9)"
                      stroke="rgba(0,212,255,0.4)"
                      strokeWidth="1.4"
                    />
                    <circle cx="80" cy="24" r="3" fill="#00d4ff" opacity="0.8" />
                  </svg>
                </div>
              </div>
              <div className="pf-facts-list">
                {facts.map((f) => (
                  <div key={f.k} className="pf-fact">
                    <span className="pf-fact-k">{f.k}</span>
                    <span className="pf-fact-v">{f.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'education_card': {
        const pills = (d.pills as string[]) || [];
        return (
          <div>
            {Boolean(d.showSectionHeader) && (
              <header className="pf-section-header">
                <span className="pf-depth-badge">{st.depthBadge}</span>
                <h2 className="pf-section-title" style={{ fontSize: '1.9rem' }}>
                  Education
                </h2>
              </header>
            )}
            <div className="pf-tl-card pf-glass-panel">
              <span className="pf-tl-year">{String(d.year)}</span>
              <h3 className="pf-tl-degree">{String(d.degree)}</h3>
              <p className="pf-tl-school">{String(d.school)}</p>
              <p className="pf-tl-desc">{String(d.desc)}</p>
              <div className="pf-pills">
                {pills.map((p) => (
                  <span key={p}>{p}</span>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'skills_card': {
        const categories =
          (d.categories as { heading: string; skills: SkillItem[] }[]) || [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <header className="pf-section-header" style={{ marginBottom: 14 }}>
              <span className="pf-depth-badge" style={{ fontSize: '1.2rem' }}>{st.depthBadge}</span>
              <h2 className="pf-section-title" style={{ fontSize: '2.45rem' }}>
                Skills
              </h2>
            </header>
            {Boolean(d.showHint) && (
              <div className="pf-jelly-hint">
                <span>🪼</span>
                <span>Drag a jellyfish to illuminate the darkness</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 24 }}>
              {categories.map((cat) => (
                <div key={cat.heading} className="pf-skill-cat pf-glass-panel">
                  <h3 className="pf-skill-cat-h">{cat.heading}</h3>
                  <ul className="pf-skill-list">
                    {cat.skills.map((sk) => (
                      <li key={sk.name} className="pf-skill-row">
                        <span className="pf-skill-name">{sk.name}</span>
                        <div className="pf-skill-track">
                          <div
                            className="pf-skill-fill"
                            style={{ width: `${sk.pct}%` }}
                          />
                        </div>
                        <span className="pf-skill-pct">{sk.pct}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'project_card': {
        const stack = (d.stack as string[]) || [];
        return (
          <div>
            <header className="pf-section-header" style={{ marginBottom: 10 }}>
              <span className="pf-depth-badge">{st.depthBadge}</span>
            </header>
            <article className="pf-proj-card pf-glass-panel">
              <div
                className="pf-proj-thumb"
                style={{ background: String(d.thumbBg) }}
              >
                {renderProjectIcon(String(d.iconType))}
              </div>
              <div className="pf-proj-body">
                <span className="pf-proj-num">{String(d.num)}</span>
                <h3 className="pf-proj-title">{String(d.title)}</h3>
                <p className="pf-proj-desc">{String(d.desc)}</p>
                <div className="pf-pills">
                  {stack.map((tech) => (
                    <span key={tech}>{tech}</span>
                  ))}
                </div>
              </div>
            </article>
          </div>
        );
      }

      case 'contact_hub':
      default:
        return (
          <div className="pf-contact-wrap">
            <header className="pf-section-header" style={{ marginBottom: 4 }}>
              <span className="pf-depth-badge">{st.depthBadge}</span>
              <h2 className="pf-section-title">The Deep End</h2>
              <p className="pf-section-sub">
                You&apos;ve reached the bottom. Let&apos;s build something
                together.
              </p>
            </header>

            <div className="pf-contact-layout">
              <blockquote className="pf-contact-quote pf-glass-panel">
                <div>
                  &ldquo;In the deepest waters, the strangest creatures glow.
                  <br />
                  I build things that combine logic and imagination too.
                  <br />
                  <em>Let&apos;s make something worth diving into.</em>&rdquo;
                </div>
                <div className="pf-avail-signal">
                  <span className="pf-avail-dot" />
                  <span>Open to internships &amp; junior developer roles</span>
                </div>
              </blockquote>

              <div className="pf-contact-cards">
                <a
                  href={`mailto:${String(d.email)}`}
                  className="pf-c-card pf-glass-panel"
                >
                  <div className="pf-c-card-icon">
                    <svg
                      viewBox="0 0 22 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    >
                      <rect x="1" y="1" width="20" height="16" rx="2" />
                      <path d="M1 4 L11 11 L21 4" />
                    </svg>
                  </div>
                  <div>
                    <span className="pf-c-card-lbl">Email</span>
                    <span className="pf-c-card-val">{String(d.email)}</span>
                  </div>
                </a>

                <a
                  href={String(d.githubUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pf-c-card pf-glass-panel"
                >
                  <div className="pf-c-card-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    >
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.3 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8 5.1 5.1 0 0 0 19.9 1S18.7.7 16 2.5a13.4 13.4 0 0 0-7 0C6.3.7 5.1 1 5.1 1A5.1 5.1 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.8c0 5.4 3.3 6.6 6.4 7a3.4 3.4 0 0 0-.9 2.6V22" />
                    </svg>
                  </div>
                  <div>
                    <span className="pf-c-card-lbl">GitHub</span>
                    <span className="pf-c-card-val">
                      {String(d.githubLabel)}
                    </span>
                  </div>
                </a>
              </div>
            </div>

            <button
              type="button"
              className="pf-return-surface"
              onClick={() => onNavigateTo(-18.3, -1.8)}
            >
              <span>↑</span>
              <span>Return to Surface</span>
            </button>
          </div>
        );
    }
  };

  return (
    <>
      {/* 1. World-Space Portfolio Cards & Stations Layer (z-index: 15) */}
      <div className="pf-world-layer">
        {PORTFOLIO_STATIONS.map((st) => (
          <div
            key={st.id}
            ref={(el) => {
              if (el) stationRefs.current.set(st.id, el);
              else stationRefs.current.delete(st.id);
            }}
            className="pf-station-node"
          >
            {renderStationContent(st)}
          </div>
        ))}
      </div>

      {/* 2. Progressive Depth Darkness Canvas (z-index: 40, above cards & caves, below jellyfish) */}
      <canvas ref={darknessCanvasRef} id="darkness-canvas" />

      {/* 3. Draggable Lottie Jellyfish Layer (z-index: 50, illuminates darkness) */}
      <div ref={jellyLayerRef} id="layer-jellyfish" />
    </>
  );
});

export default PortfolioOverlaySystem;

