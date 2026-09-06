/* db/index.js — sql.js singleton with file persistence */
const path = require('path');
const fs   = require('fs');

const DB_PATH = path.join(__dirname, 'eventos.db.bin');

let _db  = null;
let _SQL = null;

async function initDb() {
  if (_db) return _db;
  const initSqlJs = require('sql.js');
  _SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new _SQL.Database(buf);
  } else {
    _db = new _SQL.Database();
  }
  _db.run('PRAGMA foreign_keys = ON;');
  return _db;
}

function getDb() {
  if (!_db) throw new Error('DB not initialised — call await initDb() at startup');
  return _db;
}

function persist() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

module.exports = { initDb, getDb, persist };
