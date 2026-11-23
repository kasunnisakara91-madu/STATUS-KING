module.exports = async function useMongoAuthState(col, B) {
  const { initAuthCreds, proto, BufferJSON } = B;
  const ser = (d) => JSON.stringify(d, BufferJSON.replacer);
  const read = async (id) => {
    const x = await col.findOne({ _id: id });
    return x ? JSON.parse(x.v, BufferJSON.reviver) : null;
  };
  const creds = (await read('creds')) || initAuthCreds();
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const out = {};
          await Promise.all(ids.map(async (id) => {
            let v = await read(`${type}-${id}`);
            if (type === 'app-state-sync-key' && v) v = proto.Message.AppStateSyncKeyData.fromObject(v);
            out[id] = v;
          }));
          return out;
        },
        set: async (data) => {
          const ops = [];
          for (const t in data) for (const id in data[t]) {
            const v = data[t][id], _id = `${t}-${id}`;
            ops.push(v
              ? { replaceOne: { filter: { _id }, replacement: { _id, v: ser(v) }, upsert: true } }
              : { deleteOne: { filter: { _id } } });
          }
          if (ops.length) await col.bulkWrite(ops);
        }
      }
    },
    saveCreds: () => col.replaceOne({ _id: 'creds' }, { _id: 'creds', v: ser(creds) }, { upsert: true })
  };
};
