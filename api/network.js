'use strict';

const express = require('express');
const { buildGraph } = require('../lib/network');

/**
 * GET /api/network
 * Builds the account/group/identifier graph from recent high-signal detections.
 *
 * `store` must expose:
 *   getDetections({ minRisk, sinceDays }) -> Promise<Array<{
 *     userId, username, chatId, chatTitle, risk, identifiers
 *   }>>
 *
 * This keeps the route DB-agnostic: swap in a Postgres/Mongo-backed store
 * without touching the route or the graph-building logic.
 */
function createNetworkRouter(store) {
  const router = express.Router();

  router.get('/network', async (req, res) => {
    try {
      const minRisk = Number(req.query.minRisk) || 4;
      const sinceDays = Number(req.query.sinceDays) || 30;
      const rows = await store.getDetections({ minRisk, sinceDays });
      res.json(buildGraph(rows));
    } catch (err) {
      console.error('GET /api/network failed:', err);
      res.status(500).json({ error: 'failed to build network graph' });
    }
  });

  return router;
}

module.exports = { createNetworkRouter };
