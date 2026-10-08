// Inlines styles/site.css (lightly minified) into index.html's <style> block.
// Run after editing the stylesheet:  node scripts/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const css = readFileSync(new URL('../styles/site.css', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s*\n\s*/g, '')
  .replace(/\s*([{};,>])\s*/g, '$1');

const file = new URL('../index.html', import.meta.url);
const html = readFileSync(file, 'utf8').replace(/<style>[\s\S]*?<\/style>/, () => `<style>${css}</style>`);
writeFileSync(file, html);
console.log(`inlined ${css.length} bytes of CSS`);
