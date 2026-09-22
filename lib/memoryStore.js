'use strict';

/**
 * Minimal in-memory implementation of the store interface used by
 * api/detect.js and api/network.js. Good for local dev / demo; swap for a
 * real DB-backed store in production (same two methods).
 */
function createMemoryStore() {
  const detections = [];

  return {
    async saveDetection(record) {
      detections.push(record);
    },
    async getDetections({ minRisk = 0, sinceDays = 30 } = {}) {
      const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
      return detections.filter(
        d => d.risk >= minRisk && new Date(d.createdAt).getTime() >= cutoff
      );
    },
    // exposed for tests/demo seeding
    _all: detections
  };
}

module.exports = { createMemoryStore };
