const NodeCache = require('node-cache');
const crypto = require('crypto');

// 6-hour TTL cache
const cache = new NodeCache({ stdTTL: 21600, checkperiod: 600 });

function hashKey(params) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(params))
    .digest('hex');
}

function get(key) {
  return cache.get(key);
}

function set(key, value) {
  return cache.set(key, value);
}

function getStats() {
  return cache.getStats();
}

module.exports = { hashKey, get, set, getStats };
