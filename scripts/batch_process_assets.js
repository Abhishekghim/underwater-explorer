const fs = require('fs');
const path = require('path');
const { removeBackgroundPoof } = require('./remove_bg');

const INPUT_DIR = 'C:\\Users\\abhis\\Downloads\\game assestes';
const OUTPUT_DIR = path.join(INPUT_DIR, 'transparent_png');

// Game target directories
const GAME_DIR = path.resolve(__dirname, '../public/assets');
const FISH_DIR = path.join(GAME_DIR, 'fish');
const RELICS_DIR = path.join(GAME_DIR, 'relics');
const ENV_DIR = path.join(GAME_DIR, 'environment');

[OUTPUT_DIR, FISH_DIR, RELICS_DIR, ENV_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function getGameCategory(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('fish') || lower.includes('ray') || lower.includes('turtle') || lower.includes('tang')) {
    return FISH_DIR;
  }
  if (lower.includes('coral') || lower.includes('smoker') || lower.includes('crystal') || lower.includes('vent')) {
    return ENV_DIR;
  }
  return RELICS_DIR;
}

function loadKey() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      if (line.trim().startsWith('POOF_API_KEY=')) {
        return line.trim().replace('POOF_API_KEY=', '').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return null;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const apiKey = loadKey();
  if (!apiKey) {
    console.error('ERROR: POOF_API_KEY not found in .env.local');
    process.exit(1);
  }

  const allFiles = fs
    .readdirSync(INPUT_DIR)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));

  console.log(`====================================================`);
  console.log(`🌊 Batch Background Removal for Game Assets (43 files)`);
  console.log(`📁 Input:  ${INPUT_DIR}`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  console.log(`====================================================\n`);

  let completedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    const inputPath = path.join(INPUT_DIR, file);
    const baseName = path.parse(file).name;
    const outputPath = path.join(OUTPUT_DIR, `${baseName}.png`);
    const targetDir = getGameCategory(file);
    const gameDestPath = path.join(targetDir, `${baseName}.png`);

    // Check if already processed
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 100000) {
      if (!fs.existsSync(gameDestPath)) {
        fs.copyFileSync(outputPath, gameDestPath);
      }
      console.log(`[${i + 1}/${allFiles.length}] ⏩ Already done: ${file}`);
      skippedCount++;
      continue;
    }

    console.log(`[${i + 1}/${allFiles.length}] Processing: ${file}...`);

    let success = false;
    let attempts = 0;

    while (!success && attempts < 5) {
      attempts++;
      try {
        const t0 = Date.now();
        await removeBackgroundPoof(inputPath, outputPath, apiKey);
        fs.copyFileSync(outputPath, gameDestPath);

        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`   ✓ Success in ${elapsed}s! Saved to transparent_png & ${path.basename(targetDir)}/`);
        success = true;
        completedCount++;

        // Rate limit protection: 4 req/min = wait 15.5s between calls
        console.log(`   ⏳ Waiting 15.5s for free tier rate-limit pacing...`);
        await sleep(15500);
      } catch (err) {
        if (err.message.includes('rate_limit_exceeded') || err.message.includes('429')) {
          console.warn(`   ⚠️ Rate limit hit (4 req/min). Backing off for 18 seconds before retry...`);
          await sleep(18000);
        } else {
          console.error(`   ✗ Error: ${err.message}`);
          break;
        }
      }
    }
  }

  console.log(`\n====================================================`);
  console.log(`🎉 Batch Finished!`);
  console.log(`   Processed: ${completedCount}`);
  console.log(`   Skipped (already done): ${skippedCount}`);
  console.log(`   Total: ${allFiles.length}`);
  console.log(`   Destination: ${OUTPUT_DIR}`);
  console.log(`====================================================\n`);
}

run().catch(console.error);

