const fs = require('fs');
const path = require('path');

const dir = path.resolve('public/assets/silhouettes');

const silhouettes = {
  'clownfish.svg': `<svg width="200" height="130" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 130" fill="none">
  <defs>
    <linearGradient id="cf-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e3a4d"/>
      <stop offset="60%" stop-color="#122432"/>
      <stop offset="100%" stop-color="#08141c"/>
    </linearGradient>
  </defs>
  <!-- Tail fin -->
  <path d="M35 65 C15 45 5 42 2 50 C8 65 8 72 2 82 C5 90 15 88 35 70 Z" fill="#0d1b24" stroke="#254a62" stroke-width="1.2"/>
  <!-- Dorsal fin -->
  <path d="M70 42 C85 24 120 22 135 44 Z" fill="#132734" stroke="#2a526d" stroke-width="1"/>
  <!-- Pectoral fin -->
  <path d="M125 72 C110 88 95 92 90 85 C92 78 110 70 125 72 Z" fill="#152b39" opacity="0.8"/>
  <!-- Body -->
  <path d="M185 65 C175 42 145 35 110 36 C75 37 45 52 35 65 C45 78 75 93 110 94 C145 95 175 88 185 65 Z" fill="url(#cf-body)"/>
  <!-- Elegant silhouette body bands (dark translucent with cyan trim) -->
  <path d="M145 38 C140 50 140 80 145 92 C140 92 134 85 134 65 C134 45 140 38 145 38 Z" fill="#2d556e" opacity="0.45"/>
  <path d="M102 36 C96 50 96 80 102 94 C97 94 91 85 91 65 C91 45 97 36 102 36 Z" fill="#2d556e" opacity="0.45"/>
  <path d="M52 54 C48 60 48 70 52 76 C49 76 46 72 46 65 C46 58 49 54 52 54 Z" fill="#2d556e" opacity="0.45"/>
  <!-- Eye -->
  <circle cx="165" cy="58" r="3" fill="#050a0e"/>
  <circle cx="166" cy="57.5" r="1.1" fill="#65b7eb"/>
</svg>`,

  'tang.svg': `<svg width="220" height="140" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" fill="none">
  <defs>
    <linearGradient id="tang-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1d394e"/>
      <stop offset="65%" stop-color="#112330"/>
      <stop offset="100%" stop-color="#08141d"/>
    </linearGradient>
  </defs>
  <!-- Tail fin (crescent) -->
  <path d="M40 70 C20 40 5 35 2 40 C10 65 10 75 2 100 C5 105 20 100 40 70 Z" fill="#0d1b24" stroke="#2a536e" stroke-width="1.2"/>
  <!-- Dorsal & Anal long fins -->
  <path d="M75 35 C110 20 160 30 170 52 C150 42 105 38 75 35 Z" fill="#142938"/>
  <path d="M80 105 C115 120 155 110 165 88 C145 98 105 102 80 105 Z" fill="#142938"/>
  <!-- Oval flat body -->
  <path d="M195 70 C185 45 155 32 115 32 C70 32 45 52 40 70 C45 88 70 108 115 108 C155 108 185 95 195 70 Z" fill="url(#tang-body)"/>
  <!-- Signature Tang palette curve silhouette -->
  <path d="M165 52 C130 45 90 55 75 70 C85 65 125 58 160 62 Z" fill="#00d4ff" opacity="0.3"/>
  <!-- Eye -->
  <circle cx="172" cy="62" r="3.2" fill="#04080c"/>
  <circle cx="173" cy="61.5" r="1.1" fill="#65b7eb"/>
</svg>`,

  'tuna.svg': `<svg width="280" height="120" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 120" fill="none">
  <defs>
    <linearGradient id="tuna-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1f3e54"/>
      <stop offset="60%" stop-color="#122533"/>
      <stop offset="100%" stop-color="#07121a"/>
    </linearGradient>
  </defs>
  <!-- Sickle Tail -->
  <path d="M42 60 C24 28 6 12 2 15 C14 45 14 75 2 105 C6 108 24 92 42 60 Z" fill="#0d1b25" stroke="#254a62" stroke-width="1.2"/>
  <!-- Dorsal sickle fin -->
  <path d="M140 42 C152 18 162 12 165 15 C162 26 150 38 135 44 Z" fill="#162c3b"/>
  <!-- Second dorsal & anal finlets -->
  <path d="M95 44 L88 38 L84 45 L78 40 L74 46 Z" fill="#193345"/>
  <path d="M95 76 L88 82 L84 75 L78 80 L74 74 Z" fill="#193345"/>
  <!-- Hydrodynamic torpedo body -->
  <path d="M265 60 C240 44 195 38 150 38 C95 38 55 52 42 60 C55 68 95 82 150 82 C195 82 240 76 265 60 Z" fill="url(#tuna-body)"/>
  <!-- Pectoral fin swept back -->
  <path d="M190 64 C165 68 140 78 135 75 C140 70 168 62 188 62 Z" fill="#122430"/>
  <!-- Eye -->
  <circle cx="238" cy="55" r="3.2" fill="#04090d"/>
  <circle cx="239" cy="54.2" r="1.1" fill="#65b7eb"/>
</svg>`,

  'angelfish.svg': `<svg width="180" height="220" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 220" fill="none">
  <defs>
    <linearGradient id="angel-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#213f56"/>
      <stop offset="65%" stop-color="#122433"/>
      <stop offset="100%" stop-color="#08141d"/>
    </linearGradient>
  </defs>
  <!-- Elongated flowing dorsal fin -->
  <path d="M95 90 C85 40 60 10 52 4 C64 22 88 65 92 90 Z" fill="#152b3a" stroke="#2d5671" stroke-width="1"/>
  <!-- Elongated flowing anal fin -->
  <path d="M95 130 C85 180 60 210 52 216 C64 198 88 155 92 130 Z" fill="#152b3a" stroke="#2d5671" stroke-width="1"/>
  <!-- Tail fin -->
  <path d="M35 110 C15 88 4 85 2 90 C8 110 8 110 2 130 C4 135 15 132 35 110 Z" fill="#0e1d28"/>
  <!-- Diamond body -->
  <path d="M165 110 C145 85 120 78 95 85 C65 92 45 102 35 110 C45 118 65 128 95 135 C120 142 145 135 165 110 Z" fill="url(#angel-body)"/>
  <!-- Vertical silhouette banding -->
  <path d="M115 86 C110 100 110 120 115 134 C110 134 106 120 106 110 C106 100 110 86 115 86 Z" fill="#00d4ff" opacity="0.25"/>
  <path d="M78 94 C74 102 74 118 78 126 C75 126 71 118 71 110 C71 102 75 94 78 94 Z" fill="#00d4ff" opacity="0.25"/>
  <!-- Eye -->
  <circle cx="145" cy="105" r="3.2" fill="#050a0e"/>
  <circle cx="146" cy="104.2" r="1.1" fill="#65b7eb"/>
</svg>`,

  'mandarinfish.svg': `<svg width="200" height="120" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" fill="none">
  <defs>
    <linearGradient id="man-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1d384c"/>
      <stop offset="65%" stop-color="#112330"/>
      <stop offset="100%" stop-color="#08141d"/>
    </linearGradient>
  </defs>
  <!-- Flowing rounded fins -->
  <path d="M30 60 C12 40 4 45 2 52 C6 60 6 60 2 68 C4 75 12 80 30 60 Z" fill="#0e1d27" stroke="#254a62" stroke-width="1"/>
  <path d="M65 38 C75 18 105 18 115 38 Z" fill="#142a3a"/>
  <!-- Rounded dragonet body -->
  <path d="M175 60 C160 42 130 36 95 38 C60 40 40 50 30 60 C40 70 60 80 95 82 C130 84 160 78 175 60 Z" fill="url(#man-body)"/>
  <!-- Ornamental wave markings -->
  <path d="M135 48 C120 52 110 46 95 55 C85 62 105 68 125 64 Z" stroke="#00d4ff" stroke-width="1.2" opacity="0.35" fill="none"/>
  <!-- Large curious eye -->
  <circle cx="152" cy="52" r="3.6" fill="#04090d"/>
  <circle cx="153" cy="51.2" r="1.3" fill="#65b7eb"/>
</svg>`,

  'seahorse.svg': `<svg width="120" height="200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 200" fill="none">
  <defs>
    <linearGradient id="sea-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e3a4e"/>
      <stop offset="60%" stop-color="#112432"/>
      <stop offset="100%" stop-color="#07131b"/>
    </linearGradient>
  </defs>
  <!-- Curled prehensile tail -->
  <path d="M55 130 C58 155 45 180 30 185 C18 188 15 178 22 170 C28 162 38 166 38 172" stroke="#122634" stroke-width="4.5" stroke-linecap="round" fill="none"/>
  <!-- Crown / Coronet -->
  <path d="M50 25 L56 16 L64 24 L70 18 L74 26 Z" fill="#193345"/>
  <!-- Head & Snout -->
  <path d="M50 25 C50 25 78 30 82 45 C84 50 98 52 102 54 C100 58 84 58 80 62 C74 72 65 75 58 75 Z" fill="url(#sea-body)"/>
  <!-- Segmented Armored Body / Trunk -->
  <path d="M58 75 C72 82 78 100 70 115 C64 125 58 130 55 130 C48 125 45 105 48 90 C50 82 54 78 58 75 Z" fill="url(#sea-body)"/>
  <!-- Tiny dorsal fin -->
  <path d="M44 95 C34 92 34 105 44 108 Z" fill="#1a3547" opacity="0.8"/>
  <!-- Eye -->
  <circle cx="68" cy="42" r="2.8" fill="#04080c"/>
  <circle cx="69" cy="41.2" r="1.0" fill="#65b7eb"/>
</svg>`,

  'flounder.svg': `<svg width="220" height="130" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 130" fill="none">
  <defs>
    <linearGradient id="fl-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#193447"/>
      <stop offset="65%" stop-color="#0f212e"/>
      <stop offset="100%" stop-color="#061017"/>
    </linearGradient>
  </defs>
  <!-- Fan tail -->
  <path d="M35 65 C18 45 6 46 2 52 C8 65 8 65 2 78 C6 84 18 85 35 65 Z" fill="#0d1b24"/>
  <!-- Skirt perimeter fins -->
  <path d="M55 35 C100 18 150 22 170 45 C150 35 100 32 55 35 Z" fill="#122533"/>
  <path d="M55 95 C100 112 150 108 170 85 C150 95 100 98 55 95 Z" fill="#122533"/>
  <!-- Flat camouflaged body -->
  <path d="M195 65 C180 44 140 32 100 32 C60 32 40 48 35 65 C40 82 60 98 100 98 C140 98 180 86 195 65 Z" fill="url(#fl-body)"/>
  <!-- Closely spaced dorsal eyes (hallmark of flatfish) -->
  <circle cx="166" cy="54" r="2.8" fill="#04080c"/>
  <circle cx="167" cy="53.4" r="0.9" fill="#65b7eb"/>
  <circle cx="173" cy="58" r="2.8" fill="#04080c"/>
  <circle cx="174" cy="57.4" r="0.9" fill="#65b7eb"/>
</svg>`,

  'lionfish.svg': `<svg width="220" height="160" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160" fill="none">
  <defs>
    <linearGradient id="lion-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1f3b50"/>
      <stop offset="65%" stop-color="#122432"/>
      <stop offset="100%" stop-color="#08141d"/>
    </linearGradient>
  </defs>
  <!-- Dramatic venomous dorsal spines -->
  <path d="M60 70 L45 20 M75 65 L68 12 M90 62 L88 8 M105 60 L108 8 M120 62 L128 14 M135 65 L148 24" stroke="#2b536f" stroke-width="2" stroke-linecap="round"/>
  <!-- Pectoral fan rays -->
  <path d="M130 90 C110 125 90 145 75 140 C85 125 105 105 120 85 Z" fill="#152b3a" opacity="0.75" stroke="#366585" stroke-width="1"/>
  <!-- Tail fin -->
  <path d="M35 80 C18 60 6 62 2 68 C8 80 8 80 2 92 C6 98 18 100 35 80 Z" fill="#0d1b25"/>
  <!-- Body -->
  <path d="M185 80 C170 58 135 52 100 54 C65 56 45 68 35 80 C45 92 65 104 100 106 C135 108 170 102 185 80 Z" fill="url(#lion-body)"/>
  <!-- Silhouette banding -->
  <path d="M125 56 C120 70 120 90 125 104 C120 104 115 90 115 80 C115 70 120 56 125 56 Z" fill="#00d4ff" opacity="0.3"/>
  <!-- Eye -->
  <circle cx="162" cy="72" r="3.2" fill="#04090d"/>
  <circle cx="163" cy="71.2" r="1.1" fill="#65b7eb"/>
</svg>`,

  'moray.svg': `<svg width="280" height="110" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 110" fill="none">
  <defs>
    <linearGradient id="mor-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a3548"/>
      <stop offset="65%" stop-color="#10222f"/>
      <stop offset="100%" stop-color="#07121b"/>
    </linearGradient>
  </defs>
  <!-- Long sinuous continuous dorsal/anal fin ridge -->
  <path d="M10 55 C40 35 100 32 180 34 C220 35 245 42 260 48 L255 58 C220 48 180 44 100 44 C40 44 15 55 10 55 Z" fill="#142838"/>
  <!-- Sinuous serpentine body -->
  <path d="M272 54 C265 48 245 44 210 46 C160 48 110 58 70 56 C40 54 20 58 4 56 C15 64 35 68 70 66 C110 64 160 62 210 60 C245 62 265 62 272 54 Z" fill="url(#mor-body)"/>
  <!-- Distinctive agape predatory jaw -->
  <path d="M260 54 L276 50 M260 56 L274 60" stroke="#061017" stroke-width="2"/>
  <!-- Eye -->
  <circle cx="254" cy="49" r="2.6" fill="#04080c"/>
  <circle cx="255" cy="48.4" r="0.9" fill="#65b7eb"/>
</svg>`,

  'swordfish.svg': `<svg width="300" height="120" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 120" fill="none">
  <defs>
    <linearGradient id="sword-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1c394e"/>
      <stop offset="65%" stop-color="#112330"/>
      <stop offset="100%" stop-color="#07131b"/>
    </linearGradient>
  </defs>
  <!-- Massive sword bill (rostrum) -->
  <path d="M225 60 L298 59 L225 61 Z" fill="#254a64" stroke="#366687" stroke-width="1.2"/>
  <!-- Crescent tail -->
  <path d="M40 60 C22 25 5 15 2 18 C12 45 12 75 2 102 C5 105 22 95 40 60 Z" fill="#0c1922" stroke="#264c66" stroke-width="1.2"/>
  <!-- High curved sail-like first dorsal fin -->
  <path d="M140 44 C148 12 155 8 158 10 C155 24 146 38 132 45 Z" fill="#142938"/>
  <!-- Torpedo body -->
  <path d="M230 60 C210 45 175 40 135 40 C85 40 55 52 40 60 C55 68 85 80 135 80 C175 80 210 75 230 60 Z" fill="url(#sword-body)"/>
  <!-- Eye -->
  <circle cx="212" cy="55" r="3.4" fill="#04090d"/>
  <circle cx="213" cy="54.2" r="1.1" fill="#65b7eb"/>
</svg>`,

  'medusa.svg': `<svg width="180" height="240" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 240" fill="none">
  <defs>
    <linearGradient id="bell-glow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e465d" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#122a3a" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#081722" stop-opacity="0.6"/>
    </linearGradient>
  </defs>
  <!-- Bioluminescent inner organs -->
  <circle cx="90" cy="55" r="18" fill="#00d4ff" opacity="0.35"/>
  <circle cx="90" cy="55" r="8" fill="#7fdcff" opacity="0.6"/>
  <!-- Translucent umbrella bell -->
  <path d="M150 75 C150 30 125 15 90 15 C55 15 30 30 30 75 C45 70 60 76 75 72 C90 76 105 72 120 76 C135 70 145 74 150 75 Z" fill="url(#bell-glow)" stroke="#00d4ff" stroke-width="1.4" stroke-opacity="0.6"/>
  <!-- Trailing undulating tentacles with bioluminescent nodes -->
  <path d="M55 75 C50 110 65 150 55 190 C50 210 58 230 55 240" stroke="#00d4ff" stroke-width="1.4" stroke-opacity="0.4" fill="none"/>
  <path d="M75 75 C80 120 68 160 80 200 C85 220 76 235 80 240" stroke="#7fdcff" stroke-width="1.8" stroke-opacity="0.6" fill="none"/>
  <path d="M90 75 C95 115 88 155 92 195 C90 215 95 230 92 240" stroke="#00d4ff" stroke-width="2.2" stroke-opacity="0.7" fill="none"/>
  <path d="M105 75 C100 120 112 160 100 200 C95 220 104 235 100 240" stroke="#7fdcff" stroke-width="1.8" stroke-opacity="0.6" fill="none"/>
  <path d="M125 75 C130 110 115 150 125 190 C130 210 122 230 125 240" stroke="#00d4ff" stroke-width="1.4" stroke-opacity="0.4" fill="none"/>
</svg>`,

  'sunfish.svg': `<svg width="200" height="240" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" fill="none">
  <defs>
    <linearGradient id="sun-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1c374b"/>
      <stop offset="65%" stop-color="#11222f"/>
      <stop offset="100%" stop-color="#08141d"/>
    </linearGradient>
  </defs>
  <!-- Tall dorsal rudder fin -->
  <path d="M95 90 C90 35 110 10 115 6 C120 25 115 60 112 90 Z" fill="#142938"/>
  <!-- Long ventral rudder fin -->
  <path d="M95 150 C90 205 110 230 115 234 C120 215 115 180 112 150 Z" fill="#142938"/>
  <!-- Clavus (pseudo-tail rudder flap) -->
  <path d="M50 85 C35 95 32 120 32 120 C32 120 35 145 50 155 Z" fill="#0d1b25"/>
  <!-- Massive circular disc body -->
  <path d="M175 120 C165 85 140 78 105 82 C70 85 55 100 50 120 C55 140 70 155 105 158 C140 162 165 155 175 120 Z" fill="url(#sun-body)"/>
  <!-- Eye -->
  <circle cx="152" cy="112" r="3.6" fill="#04090d"/>
  <circle cx="153" cy="111.2" r="1.1" fill="#65b7eb"/>
</svg>`,

  'pufferfish.svg': `<svg width="180" height="150" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 150" fill="none">
  <defs>
    <linearGradient id="puf-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1d384c"/>
      <stop offset="65%" stop-color="#112330"/>
      <stop offset="100%" stop-color="#08141d"/>
    </linearGradient>
  </defs>
  <!-- Tiny tail fin -->
  <path d="M25 75 C12 60 4 62 2 66 C5 75 5 75 2 84 C4 88 12 90 25 75 Z" fill="#0e1d27"/>
  <!-- Inflated spherical body -->
  <path d="M155 75 C145 42 118 28 85 28 C52 28 28 50 25 75 C28 100 52 122 85 122 C118 122 145 108 155 75 Z" fill="url(#puf-body)"/>
  <!-- Defensive sharp spines around circumference -->
  <path d="M60 28 L58 20 M85 28 L85 18 M110 30 L114 22 M40 45 L32 38 M135 48 L144 42 M30 85 L20 88 M148 95 L156 100 M60 120 L56 128 M85 122 L85 132 M110 120 L115 128" stroke="#366585" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Eye -->
  <circle cx="132" cy="65" r="4.0" fill="#04090d"/>
  <circle cx="133" cy="64.0" r="1.3" fill="#65b7eb"/>
</svg>`
};

Object.entries(silhouettes).forEach(([filename, content]) => {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content.trim(), 'utf8');
  console.log('Created ' + filename);
});

