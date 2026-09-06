/* db/helpers.js — sql.js query helpers */

function query(db, sql, params) {
  const stmt = db.prepare(sql);
  if (params && params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(db, sql, params) {
  const rows = query(db, sql, params);
  return rows.length ? rows[0] : null;
}

function run(db, sql, params) {
  const stmt = db.prepare(sql);
  if (params && params.length) stmt.bind(params);
  stmt.step();
  stmt.free();
}

module.exports = { query, queryOne, run };
