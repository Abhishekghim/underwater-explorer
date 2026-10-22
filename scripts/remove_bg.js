const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Path to locally installed withoutbg executable
const WITHOUTBG_EXE = path.join(
  process.env.USERPROFILE || 'C:\\Users\\abhis',
  '.local',
  'bin',
  'withoutbg.exe'
);

// Load POOF_API_KEY from .env.local if present
function getPoofApiKey() {
  if (process.env.POOF_API_KEY) return process.env.POOF_API_KEY;

  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('POOF_API_KEY=')) {
        const val = trimmed.replace('POOF_API_KEY=', '').trim().replace(/^["']|["']$/g, '');
        if (val) return val;
      }
    }
  }
  return null;
}

/**
 * Remove background locally using withoutbg (Free, offline AI model)
 */
function removeBackgroundLocal(inputImagePath, outputPngPath) {
  if (!fs.existsSync(WITHOUTBG_EXE)) {
    throw new Error(`withoutbg executable not found at: ${WITHOUTBG_EXE}`);
  }

  console.log(`[withoutbg-local] Removing background locally via AI: "${inputImagePath}"...`);
  const outDir = path.dirname(outputPngPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  execFileSync(WITHOUTBG_EXE, [inputImagePath, '--output', outputPngPath], {
    stdio: 'inherit',
  });

  console.log(`[withoutbg-local] Successfully saved transparent cutout: ${outputPngPath}`);
  return outputPngPath;
}

/**
 * Remove background using Poof.bg Cloud API
 */
async function removeBackgroundPoof(inputImagePath, outputPngPath, apiKey) {
  const fileBytes = fs.readFileSync(inputImagePath);
  const fileName = path.basename(inputImagePath);

  const formData = new FormData();
  const blob = new Blob([fileBytes], { type: 'application/octet-stream' });
  formData.append('image_file', blob, fileName);

  console.log(`[poof.bg] Uploading "${fileName}" to Poof.bg Cloud API...`);
  const response = await fetch('https://api.poof.bg/v1/remove', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Poof.bg API error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const outDir = path.dirname(outputPngPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPngPath, buffer);
  console.log(`[poof.bg] Successfully saved transparent cutout: ${outputPngPath}`);
  return outputPngPath;
}

/**
 * Primary auto-routing background removal function
 */
async function removeBackground(inputImagePath, outputPngPath) {
  if (!fs.existsSync(inputImagePath)) {
    throw new Error(`Input image file not found: ${inputImagePath}`);
  }

  const poofKey = getPoofApiKey();
  if (poofKey) {
    try {
      return await removeBackgroundPoof(inputImagePath, outputPngPath, poofKey);
    } catch (err) {
      console.warn(`[poof.bg] Cloud API failed: ${err.message}. Falling back to local withoutbg model...`);
    }
  }

  // Fallback or default to local offline withoutbg model
  return removeBackgroundLocal(inputImagePath, outputPngPath);
}

// CLI execution: node scripts/remove_bg.js [input-path] [output-path]
if (require.main === module) {
  const args = process.argv.slice(2);
  const rawDir = path.resolve(__dirname, '../raw_images');
  const processedDir = path.resolve(__dirname, '../public/assets/processed');

  (async () => {
    if (args.length === 0 || args[0] === '--batch') {
      console.log(`Scanning "${rawDir}" for images to process...`);
      if (!fs.existsSync(rawDir)) {
        fs.mkdirSync(rawDir, { recursive: true });
      }
      const files = fs.readdirSync(rawDir).filter((f) =>
        /\.(png|jpe?g|webp|bmp)$/i.test(f)
      );

      if (files.length === 0) {
        console.log(`\nNo images found in: ${rawDir}`);
        console.log(`Drop your images (.png, .jpg, .webp) into:`);
        console.log(`  c:\\xampp\\htdocs\\underwater-explorer\\raw_images\\`);
        console.log(`and run "node scripts/remove_bg.js" again!\n`);
        process.exit(0);
      }

      console.log(`Found ${files.length} image(s). Processing with GPU/AI...`);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const inputPath = path.join(rawDir, file);
        const baseName = path.parse(file).name;
        const outputPath = path.join(processedDir, `${baseName}.png`);

        console.log(`\n[${i + 1}/${files.length}] Processing ${file} -> public/assets/processed/${baseName}.png`);
        try {
          await removeBackground(inputPath, outputPath);
        } catch (err) {
          console.error(`Failed to process ${file}:`, err.message);
        }
      }
      console.log(`\nAll done! Transparent cutouts saved to: ${processedDir}`);
    } else {
      const inputPath = path.resolve(args[0]);
      const outputPath =
        args[1] ? path.resolve(args[1]) : inputPath.replace(/\.[^/.]+$/, '') + '_nobg.png';

      await removeBackground(inputPath, outputPath);
    }
  })()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

module.exports = { removeBackground, removeBackgroundLocal, removeBackgroundPoof };
