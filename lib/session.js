import fs from 'fs';
import mongoose from 'mongoose';
import { initAuthCreds, BufferJSON, proto, useMultiFileAuthState } from '@itsliaaa/baileys';
import config from '../config.js';

const Auth = mongoose.models.Auth || mongoose.model('Auth', new mongoose.Schema({ _id: String, data: String }));
const useMongo = () => !!config.MONGO_URI;

async function mongoState(sid) {
  const w = (id, v) => Auth.updateOne({ _id: `${sid}:${id}` }, { data: JSON.stringify(v, BufferJSON.replacer) }, { upsert: true });
  const r = async (id) => { const d = await Auth.findById(`${sid}:${id}`); return d ? JSON.parse(d.data, BufferJSON.reviver) : null; };
  const del = (id) => Auth.deleteOne({ _id: `${sid}:${id}` });
  const creds = (await r('creds')) || initAuthCreds();
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const out = {};
          await Promise.all(ids.map(async (id) => {
            let v = await r(`${type}-${id}`);
            if (type === 'app-state-sync-key' && v) v = proto.Message.AppStateSyncKeyData.fromObject(v);
            out[id] = v;
          }));
          return out;
        },
        set: async (data) => {
          const t = [];
          for (const c in data) for (const id in data[c]) { const v = data[c][id]; t.push(v ? w(`${c}-${id}`, v) : del(`${c}-${id}`)); }
          await Promise.all(t);
        },
      },
    },
    saveCreds: () => w('creds', creds),
  };
}

export const getAuthState = (sid) => (useMongo() ? mongoState(sid) : useMultiFileAuthState(`./sessions/${sid}`));

export async function removeSession(sid) {
  if (useMongo()) await Auth.deleteMany({ _id: new RegExp(`^${sid}:`) });
  else fs.rmSync(`./sessions/${sid}`, { recursive: true, force: true });
}

export async function listSessions() {
  if (useMongo()) return (await Auth.find({ _id: /:creds$/ }, { _id: 1 })).map((d) => d._id.replace(':creds', ''));
  return fs.existsSync('./sessions') ? fs.readdirSync('./sessions') : [];
}
