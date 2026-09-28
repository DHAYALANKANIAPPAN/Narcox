'use strict';

const { MongoClient } = require('mongodb');

async function createMongoStore({
  uri = process.env.MONGODB_URI,
  dbName = process.env.MONGODB_DB || 'narcox',
  collectionName = 'detections'
} = {}) {
  if (!uri) {
    throw new Error('createMongoStore: MONGODB_URI is not set');
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000
  });
  await client.connect();

  const db = client.db(dbName);
  const detections = db.collection(collectionName);

  await Promise.all([
    detections.createIndex({ risk: 1, ts: -1 }),
    detections.createIndex({ userId: 1 }),
    detections.createIndex({ chatId: 1 })
  ]);

  return {
    async saveDetection(record) {
      await detections.insertOne({
        ...record,
        createdAt: record.createdAt ? new Date(record.createdAt) : new Date()
      });
    },

    async getDetections({ minRisk = 0, sinceDays = 30 } = {}) {
      const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
      const rows = await detections
        .find({ risk: { $gte: minRisk }, ts: { $gte: cutoff } })
        .sort({ ts: -1 })
        .toArray();
      return rows.map(({ _id, ...rest }) => rest);
    },

    async close() {
      await client.close();
    },

    _client: client,
    _collection: detections
  };
}

let _cachedClient = null;
let _cachedDb = null;

async function getDb({
  uri = process.env.MONGODB_URI,
  dbName = process.env.MONGODB_DB || 'narcox'
} = {}) {
  if (_cachedDb) return _cachedDb;

  if (!uri) {
    throw new Error('getDb: MONGODB_URI is not set');
  }

  _cachedClient = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000
  });
  await _cachedClient.connect();

  _cachedDb = _cachedClient.db(dbName);
  return _cachedDb;
}

module.exports = { createMongoStore, getDb };
