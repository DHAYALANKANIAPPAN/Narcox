'use strict';

const { MongoClient } = require('mongodb');

/**
 * Mongo-backed implementation of the store interface used by
 * api/detect.js and api/network.js (same shape as memoryStore.js):
 *
 *   saveDetection(record) -> Promise<void>
 *   getDetections({ minRisk, sinceDays }) -> Promise<Array<record>>
 *
 * Config via env:
 *   MONGODB_URI  - connection string (required)
 *   MONGODB_DB   - database name (default: "narcox")
 *
 * Usage (server.js):
 *   const { createMongoStore } = require('./lib/db');
 *   const store = await createMongoStore();
 *   ...
 *   process.on('SIGTERM', () => store.close());
 */
async function createMongoStore({
  uri = process.env.MONGODB_URI,
  dbName = process.env.MONGODB_DB || 'narcox',
  collectionName = 'detections'
} = {}) {
  if (!uri) {
    throw new Error('createMongoStore: MONGODB_URI is not set');
  }

  const client = new MongoClient(uri, {
    // fail fast instead of hanging if Mongo is unreachable
    serverSelectionTimeoutMS: 8000
  });
  await client.connect();

  const db = client.db(dbName);
  const detections = db.collection(collectionName);

  // Indexes that match the query patterns used above:
  //  - getDetections filters by risk + createdAt (network graph)
  //  - lookups by userId/chatId are common for per-account history
  await Promise.all([
    detections.createIndex({ risk: 1, createdAt: -1 }),
    detections.createIndex({ userId: 1 }),
    detections.createIndex({ chatId: 1 })
  ]);

  return {
    async saveDetection(record) {
      await detections.insertOne({
        ...record,
        // store as a real Date so range queries are efficient/correct;
        // callers pass an ISO string (see api/detect.js), so normalize it
        createdAt: record.createdAt ? new Date(record.createdAt) : new Date()
      });
    },

    async getDetections({ minRisk = 0, sinceDays = 30 } = {}) {
      const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
      const rows = await detections
        .find({ risk: { $gte: minRisk }, createdAt: { $gte: cutoff } })
        .sort({ createdAt: -1 })
        .toArray();
      // network.js/buildGraph doesn't expect Mongo's _id / ObjectId fields
      return rows.map(({ _id, ...rest }) => rest);
    },

    async close() {
      await client.close();
    },

    // exposed for tests/ops
    _client: client,
    _collection: detections
  };
}

module.exports = { createMongoStore };
