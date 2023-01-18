import initSqlJs from "./wasm/sqljs-worker/worker.sql-wasm.js";

const sql = await fetch(
  new URL("./wasm/sqljs-worker/sql-wasm.wasm", import.meta.url)
)
  .then((r) => r.arrayBuffer())
  .then((wasmBinary) => initSqlJs({ wasmBinary }));

export default async (
  get_: () => Promise<ArrayBuffer | void>,
  set: (buffer: ArrayBuffer) => boolean | Promise<boolean>,
  ok?: () => boolean | Promise<boolean>
) => {
  const get = async () => {
    const buffer = await get_();
    return new sql.Database(buffer ? new Uint8Array(buffer) : undefined);
  };

  let db;
  return {
    _db: db,
    query: async (query, ...props) => {
      db = ok ? ((await ok()) ? db : await get()) : await get();
      return db.exec(query, ...props).then(async (res) => {
        if (query.match(/DELETE|INSERT|UPDATE|CREATE/gi))
          await set(db.export());
        return res;
      });
    },
  };
};
