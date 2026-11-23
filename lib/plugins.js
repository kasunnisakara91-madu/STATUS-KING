import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export const plugins = [];
export async function loadPlugins(dir = './plugins') {
  plugins.length = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    try {
      const mod = await import(pathToFileURL(path.resolve(dir, f)).href);
      if (mod.default?.cmd) plugins.push(mod.default);
    } catch (e) { console.error(`[plugin:${f}]`, e.message); }
  }
  console.log(`✅ ${plugins.length} plugins loaded`);
}
