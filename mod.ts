import initSqlJs from "./wasm/sqljs-worker/worker.sql-wasm.js";

const sql = await fetch(
  new URL("./wasm/sqljs-worker/sql-wasm.wasm", import.meta.url)
)
  .then((r) => r.arrayBuffer())
  .then((wasmBinary) => initSqlJs({ wasmBinary }));

export default async (
  get_: () => Promise<ArrayBuffer | void>,
  set: (buffer: Uint8Array) => boolean | Promise<boolean>,
  gethash?: () => string | Promise<string>
) => {
  const get = async () => {
    const buffer = await get_();
    return new sql.Database(buffer ? new Uint8Array(buffer) : undefined);
  };

  let hash: undefined | string = await gethash?.();
  let db = await get();
  return {
    _db: db,
    query: async (query, ...props) => {
      const newhash = await gethash?.();
      if (newhash !== hash || !newhash) db = await get();
      hash = newhash;
      return Promise.resolve()
        .then(() => db.exec(query, ...props))
        .catch((error) => ({ error }))
        .then(async (res) => {
          if (query.match(/DELETE|INSERT|UPDATE|CREATE/gi))
            await set(db.export());
          return res?.error
            ? res
            : (res?.[0]?.values ?? []).map((value) =>
                Object.fromEntries(
                  value.map((value, i) => [res[0].columns[i], value])
                )
              );
        });
    },
  };
};
