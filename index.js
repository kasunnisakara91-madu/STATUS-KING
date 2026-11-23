import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import { loadPlugins } from './lib/plugins.js';
import { pairNumber, startBot } from './lib/bot.js';
import { listSessions } from './lib/session.js';

process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));
const dir = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.static(path.join(dir, 'public')));
const page = (_, res) => res.sendFile(path.join(dir, 'public', 'pair.html'));
app.get('/', page);
app.get('/main', page);

app.get('/api/pair', async (req, res) => {
  const number = String(req.query.number || '').replace(/\D/g, '');
  if (number.length < 9) return res.status(400).json({ error: 'Invalid number' });
  try { res.json({ code: await pairNumber(number) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(config.PORT, () => console.log(`🌐 http://localhost:${config.PORT}`));

if (config.MONGO_URI) { await mongoose.connect(config.MONGO_URI); console.log('🍃 MongoDB connected'); }
await loadPlugins();
for (const id of await listSessions()) startBot(id).catch(console.error);
