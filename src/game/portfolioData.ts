export type PortfolioSectionId =
  | 'home'
  | 'about'
  | 'education'
  | 'skills'
  | 'projects'
  | 'contact';

export interface PortfolioNavTarget {
  id: PortfolioSectionId;
  label: string;
  worldX: number;
  worldY: number;
  depthLabel: string;
  zoneLabel: string;
}

export interface SkillItem {
  name: string;
  pct: number;
}

export interface PortfolioStation {
  id: string;
  section: PortfolioSectionId;
  title: string;
  depthBadge: string;
  worldX: number;
  worldY: number;
  scale?: number;
  type:
    | 'hero'
    | 'about_bio'
    | 'about_avatar'
    | 'education_card'
    | 'skills_card'
    | 'project_card'
    | 'contact_hub';
  data: Record<string, unknown>;
}

/**
 * Primary navigation waypoints for the top Portfolio Navbar
 * Clicking any nav link smoothly glides the diver & camera to that cavern station.
 */
export const PORTFOLIO_NAV_TARGETS: PortfolioNavTarget[] = [
  {
    id: 'home',
    label: 'Home',
    worldX: -18.3,
    worldY: -1.8,
    depthLabel: '0 m',
    zoneLabel: 'Surface',
  },
  {
    id: 'about',
    label: 'About',
    worldX: -27.0,
    worldY: -19.5,
    depthLabel: '30 m',
    zoneLabel: 'Shallow Water',
  },
  {
    id: 'education',
    label: 'Education',
    worldX: -58.0,
    worldY: -18.0,
    depthLabel: '80 m',
    zoneLabel: 'Twilight Zone',
  },
  {
    id: 'skills',
    label: 'Skills',
    worldX: -47.0,
    worldY: -59.5,
    depthLabel: '200 m',
    zoneLabel: 'Midnight Zone',
  },
  {
    id: 'projects',
    label: 'Projects',
    worldX: -3.0,
    worldY: -67.0,
    depthLabel: '600 m',
    zoneLabel: 'Abyssal Zone',
  },
  {
    id: 'contact',
    label: 'Contact',
    worldX: 16.0,
    worldY: -116.0,
    depthLabel: '1000 m',
    zoneLabel: 'Hadal Zone',
  },
];

/**
 * All Resume & Portfolio Stations spread across verified open-water caverns in the map.
 * Content is 100% faithful to C:\xampp\htdocs\portfolio\index.html.
 */
export const PORTFOLIO_STATIONS: PortfolioStation[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SURFACE HERO (Above / At Waterline: X = -18.3, Y = +2.4)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'station_hero',
    section: 'home',
    title: 'Abhishek Ghimire',
    depthBadge: '~ 0 m · Surface',
    worldX: -18.3,
    worldY: 3.15,
    scale: 0.92,
    type: 'hero',
    data: {
      firstName: 'ABHISHEK',
      lastName: 'GHIMIRE',
      role: 'IT Student & Creative Technologist',
      tagline:
        'I build things that live at the intersection of software and imagination — from database schemas to interactive experiences like this one.',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ABOUT ME (Spread across Central Sunlit Cavern & East Sunlit Shelf)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'station_about_bio',
    section: 'about',
    title: 'About Me',
    depthBadge: '~ 30 m · Shallow Water',
    worldX: -27.0,
    worldY: -19.5,
    scale: 1.24,
    type: 'about_bio',
    data: {
      intro: "Hey, I'm Abhishek — a Bachelor of IT student who builds things that breathe.",
      p1: "I'm studying a Bachelor of IT (Victoria University, via Kent Institute Australia), combining software development, databases and networking with a genuine interest in visual design. I've built full-stack apps like an MRI management system and an expense-splitting tool, worked through relational database and Cisco networking projects, and enjoy exploring the space between engineering and imagination.",
      p2: "When I'm not writing code, you'll find me experimenting in Photoshop and After Effects, sketching scenes in Blender, or dreaming up interactive website concepts — like the underwater dive you're exploring right now.",
      stats: [
        { num: '6', label: 'Projects' },
        { num: '15', label: 'Technologies' },
        { num: '5', label: 'Industries' },
        { num: '3', label: 'Creative Tools' },
      ],
    },
  },
  {
    id: 'station_about_avatar',
    section: 'about',
    title: 'Quick Facts & Profile',
    depthBadge: '~ 35 m · East Sunlit Shelf',
    worldX: 2.0,
    worldY: -10.0,
    scale: 1.26,
    type: 'about_avatar',
    data: {
      facts: [
        { k: 'Location', v: 'Australia' },
        { k: 'Focus', v: 'Software & Web Dev' },
        { k: 'Status', v: 'Open to Internships' },
        { k: 'Style', v: 'Builder + Designer' },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. EDUCATION (Spread across Western Kelp Grotto & Far-East Sunlit Reef)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'station_edu_vu',
    section: 'education',
    title: 'Bachelor of Information Technology',
    depthBadge: '~ 80 m · Education (1/2)',
    worldX: -58.0,
    worldY: -18.0,
    scale: 1.26,
    type: 'education_card',
    data: {
      showSectionHeader: true,
      year: 'Expected Nov 2026',
      degree: 'Bachelor of Information Technology',
      school: 'Victoria University · via Kent Institute Australia',
      desc: 'Degree awarded by Victoria University — 6 units completed directly at VU, the remainder at Kent Institute Australia. Coursework spanning software development, database management, system analysis & design, and computer networking — combining Agile/Scrum practice with hands-on Java, SQL and web development.',
      pills: ['Software Dev', 'Databases', 'Networking'],
    },
  },
  {
    id: 'station_edu_indep',
    section: 'education',
    title: 'Independent Development & Design Practice',
    depthBadge: '~ 85 m · Education (2/2)',
    worldX: 50.0,
    worldY: -16.0,
    scale: 1.26,
    type: 'education_card',
    data: {
      showSectionHeader: true,
      year: 'Ongoing',
      degree: 'Independent Development & Design Practice',
      school: 'Self-directed projects',
      desc: 'Learning full-stack web development (React, Next.js, Supabase) and visual design (Photoshop, After Effects, Blender) outside the classroom by building real projects end to end.',
      pills: ['Full-Stack', 'Web Dev', 'Creative Tools'],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SKILLS (Spread across Mid-Depth Crossroads, Eastern Grand Chamber & Coral Canyon)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'station_skills_web_db',
    section: 'skills',
    title: 'Web Dev & Databases',
    depthBadge: '~ 200 m · Midnight Zone',
    worldX: -47.0,
    worldY: -59.5,
    scale: 1.24,
    type: 'skills_card',
    data: {
      showHint: true,
      categories: [
        {
          heading: 'Web Development',
          skills: [
            { name: 'HTML / CSS', pct: 80 },
            { name: 'JavaScript', pct: 75 },
            { name: 'React', pct: 65 },
            { name: 'Next.js', pct: 60 },
            { name: 'Tailwind CSS', pct: 65 },
          ],
        },
        {
          heading: 'Programming & Databases',
          skills: [
            { name: 'Java', pct: 75 },
            { name: 'SQL / MySQL', pct: 78 },
            { name: 'PostgreSQL', pct: 70 },
            { name: 'Supabase', pct: 65 },
            { name: 'REST APIs', pct: 65 },
          ],
        },
      ],
    },
  },
  {
    id: 'station_skills_sys',
    section: 'skills',
    title: 'Systems & Software Eng.',
    depthBadge: '~ 160 m · Eastern Chamber',
    worldX: 62.0,
    worldY: -28.0,
    scale: 1.28,
    type: 'skills_card',
    data: {
      showHint: false,
      categories: [
        {
          heading: 'Systems & Software Eng.',
          skills: [
            { name: 'SDLC / Agile', pct: 78 },
            { name: 'UML & DFDs', pct: 72 },
            { name: 'Database Design', pct: 75 },
            { name: 'Networking (Cisco)', pct: 68 },
            { name: 'Scrum', pct: 70 },
          ],
        },
      ],
    },
  },
  {
    id: 'station_skills_creative',
    section: 'skills',
    title: 'Creative & Design',
    depthBadge: '~ 210 m · Eastern Coral Canyon',
    worldX: 66.0,
    worldY: -51.0,
    scale: 1.28,
    type: 'skills_card',
    data: {
      showHint: true,
      categories: [
        {
          heading: 'Creative & Design',
          skills: [
            { name: 'Photoshop', pct: 85 },
            { name: 'After Effects', pct: 60 },
            { name: 'Blender', pct: 35 },
            { name: 'UI / Visual Design', pct: 70 },
            { name: 'Motion Graphics', pct: 55 },
          ],
        },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PROJECTS (6 Cards Spread Across the Deep Caverns & Trenches)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'station_proj_01',
    section: 'projects',
    title: 'Capital Radiology',
    depthBadge: '~ 260 m · Project 01/06',
    worldX: -81.0,
    worldY: -59.0,
    scale: 1.26,
    type: 'project_card',
    data: {
      num: '01',
      title: 'CAPITAL RADIOLOGY',
      desc: 'Full-stack MRI management system with role-based access, Supabase authentication & row-level security, and a simulated DICOM viewer for handling patient scans.',
      stack: ['Next.js', 'React', 'Supabase'],
      thumbBg: 'linear-gradient(135deg,#0d4a68,#082440)',
      iconType: 'radiology',
    },
  },
  {
    id: 'station_proj_02',
    section: 'projects',
    title: 'Expense Splitter',
    depthBadge: '~ 320 m · Project 02/06',
    worldX: -73.0,
    worldY: -75.0,
    scale: 1.26,
    type: 'project_card',
    data: {
      num: '02',
      title: 'EXPENSE SPLITTER',
      desc: 'A Splitwise-inspired web app for tracking shared expenses and splitting group costs, backed by a relational database and full-stack architecture.',
      stack: ['React', 'Node.js', 'PostgreSQL'],
      thumbBg: 'linear-gradient(135deg,rgba(0,255,210,0.35),#082440)',
      iconType: 'expense',
    },
  },
  {
    id: 'station_proj_03',
    section: 'projects',
    title: 'UNO Card Game',
    depthBadge: '~ 300 m · Project 03/06',
    worldX: -3.0,
    worldY: -67.0,
    scale: 1.26,
    type: 'project_card',
    data: {
      num: '03',
      title: 'UNO CARD GAME',
      desc: 'A digital take on the classic UNO card game, built to explore object-oriented game logic, state management and turn-based interaction.',
      stack: ['Java', 'OOP', 'Game Logic'],
      thumbBg: 'linear-gradient(135deg,#ff6b35,#7a2f0d)',
      iconType: 'uno',
    },
  },
  {
    id: 'station_proj_04',
    section: 'projects',
    title: 'This Underwater Portfolio',
    depthBadge: '~ 310 m · Project 04/06',
    worldX: 72.0,
    worldY: -70.0,
    scale: 1.26,
    type: 'project_card',
    data: {
      num: '04',
      title: 'THIS UNDERWATER PORTFOLIO',
      desc: 'The interactive experience you are exploring right now — a playable dive from the sunlit surface to the hadal zone, built with Three.js, parallax cave layers, and jellyfish-lit abyssal caverns.',
      stack: ['Next.js', 'Three.js', 'TypeScript', 'GLSL'],
      thumbBg: 'linear-gradient(135deg,#041428,#00d4ff33)',
      iconType: 'portfolio',
    },
  },
  {
    id: 'station_proj_05',
    section: 'projects',
    title: 'Database Design Projects',
    depthBadge: '~ 480 m · Project 05/06',
    worldX: -34.0,
    worldY: -102.0,
    scale: 1.26,
    type: 'project_card',
    data: {
      num: '05',
      title: 'DATABASE DESIGN PROJECTS',
      desc: 'A set of relational schema & query projects — normalised designs with primary/foreign keys, cascading rules and referential integrity across multi-table datasets.',
      stack: ['SQL', 'MySQL', 'PostgreSQL'],
      thumbBg: 'linear-gradient(135deg,rgba(180,80,255,0.45),#082440)',
      iconType: 'database',
    },
  },
  {
    id: 'station_proj_06',
    section: 'projects',
    title: 'Cisco Network Design',
    depthBadge: '~ 560 m · Project 06/06',
    worldX: -62.0,
    worldY: -115.0,
    scale: 1.26,
    type: 'project_card',
    data: {
      num: '06',
      title: 'CISCO NETWORK DESIGN',
      desc: 'Subnetting and network topology exercises in Cisco Packet Tracer — IP addressing, VLSM, WAN and WLAN configuration for multi-site scenarios.',
      stack: ['Packet Tracer', 'VLSM', 'WAN/WLAN'],
      thumbBg: 'linear-gradient(135deg,#1a6b8a,#020810)',
      iconType: 'cisco',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CONTACT — "THE DEEP END" (Hadal / Abyssal Central Basin: X = 16, Y = -116)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'station_contact',
    section: 'contact',
    title: 'The Deep End — Contact',
    depthBadge: '~ 1000 m · Hadal Zone',
    worldX: 16.0,
    worldY: -116.0,
    scale: 1.24,
    type: 'contact_hub',
    data: {
      email: 'abhighimi@gmail.com',
      githubUrl: 'https://github.com/Abhishekghim',
      githubLabel: 'github.com/Abhishekghim',
    },
  },
];

