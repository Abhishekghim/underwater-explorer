const fs = require('fs');
const path = require('path');

const dir = path.resolve('public/assets/silhouettes');
fs.readdirSync(dir).filter(f => f.endsWith('.svg')).forEach(file => {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  const vbMatch = content.match(/viewBox=["']\s*([0-9\.-]+)\s+([0-9\.-]+)\s+([0-9\.-]+)\s+([0-9\.-]+)\s*["']/);
  if (vbMatch) {
    const w = vbMatch[3];
    const h = vbMatch[4];
    const hasWidth = /<svg[^>]*\bwidth=/.test(content);
    const hasHeight = /<svg[^>]*\bheight=/.test(content);
    if (!hasWidth || !hasHeight) {
      content = content.replace(/<svg\s+/, `<svg width="${w}" height="${h}" `);
      fs.writeFileSync(p, content, 'utf8');
      console.log(`Added width=${w} height=${h} to ${file}`);
    } else {
      console.log(`${file} already has dimensions`);
    }
  }
});

