'use strict';

const express = require('express');
const { analyze } = require('../lib/detector');

const VALID_PLATFORMS = new Set(['telegram', 'instagram']);
const VALID_MEDIA_TYPES = new Set(['text', 'image', 'caption', 'unknown']);

/**
 * POST /api/detect
 * body: {
 *   text, userId, username, chatId, chatTitle,
 *   platform,        // "telegram" | "instagram" - required to persist (Akshiya/Lingesh set this)
 *   mediaType,        // "text" | "image" | "caption" | "unknown" (default: "text")
 *   ts,               // origin timestamp (ms epoch or ISO string) from the source platform;
 *                      // defaults to receipt time if omitted
 *   imageLabels       // string[] - Lingesh's image-analysis output, passed through untouched
 * }
 *
 * Runs the detector on `text`, optionally persists the detection via
 * `store.saveDetection(record)` when store metadata is provided, and always
 * returns the analysis so callers can act on it (e.g. flag, alert, ignore).
 *
 * The saved record follows the team's shared "detections" data contract
 * exactly (see PROJECT CONTEXT): platform, chatId, chatTitle, userId,
 * username, text, mediaType, ts, risk, level, categories, matches,
 * identifiers, reasons, imageLabels. Dropping any of these breaks
 * lib/network.js and the dashboard filters that read them, so every field
 * in the contract is always present on the saved record (with a safe
 * default), never omitted just because a caller didn't send it.
 *
 * `store` (optional) must expose: saveDetection(record) -> Promise<void>
 */
function createDetectRouter(store) {
  const router = express.Router();

  router.post('/detect', express.json({ limit: '20kb' }), async (req, res) => {
    const {
      text, userId, username, chatId, chatTitle,
      platform, mediaType, ts, imageLabels
    } = req.body || {};

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    if (text.length > 4000) {
      return res.status(413).json({ error: 'text exceeds 4000 character limit' });
    }
    if (platform !== undefined && !VALID_PLATFORMS.has(platform)) {
      return res.status(400).json({ error: `platform must be one of: ${[...VALID_PLATFORMS].join(', ')}` });
    }
    if (mediaType !== undefined && !VALID_MEDIA_TYPES.has(mediaType)) {
      return res.status(400).json({ error: `mediaType must be one of: ${[...VALID_MEDIA_TYPES].join(', ')}` });
    }
    if (imageLabels !== undefined && !Array.isArray(imageLabels)) {
      return res.status(400).json({ error: 'imageLabels must be an array of strings' });
    }

    const result = analyze(text);

    // Persisting needs enough identity to be useful later (network graph,
    // per-account history) - platform is required so mixed Telegram/Instagram
    // data never collapses into "unknown" and becomes unattributable.
    if (store && userId != null && chatId != null && platform) {
      try {
        await store.saveDetection({
          platform,
          chatId,
          chatTitle: chatTitle || 'unknown',
          userId,
          username: username || 'unknown',
          text,
          mediaType: mediaType || 'text',
          ts: ts ? new Date(ts).toISOString() : new Date().toISOString(),
          risk: result.risk,
          level: result.level,
          categories: result.categories,
          matches: result.matches,
          identifiers: result.identifiers,
          reasons: result.reasons,
          imageLabels: imageLabels || [],
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('failed to persist detection:', err);
        // don't fail the request just because persistence failed
      }
    }

    res.json(result);
  });

  return router;
}

module.exports = { createDetectRouter };
