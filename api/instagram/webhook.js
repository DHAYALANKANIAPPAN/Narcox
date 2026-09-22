const { getDb } = require('../../lib/db');
const { analyze } = require('../../lib/detector');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.IG_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    const entries = req.body.entry || [];
    const items = [];

    for (const e of entries) {
      if (e.messaging) {
        for (const m of e.messaging) {
          if (m.message && m.message.text) {
            items.push({
              userId: String(m.sender.id),
              username: String(m.sender.id),
              text: m.message.text,
              ts: new Date(m.timestamp),
              mediaType: 'text',
              chat: 'IG DM'
            });
          }
        }
      }

      if (e.changes) {
        for (const c of e.changes) {
          if (c.field === 'comments' && c.value && c.value.text) {
            items.push({
              userId: String(c.value.from.id),
              username: c.value.from.username,
              text: c.value.text,
              ts: new Date(),
              mediaType: 'comment',
              chat: 'IG post ' + c.value.media.id
            });
          }
        }
      }
    }

    const db = await getDb();

    for (const item of items) {
      const a = analyze(item.text);
      if (a.risk === 0) continue;

      await db.collection('detections').insertOne({
        platform: 'instagram',
        chatId: item.chat,
        chatTitle: item.chat,
        userId: item.userId,
        username: item.username,
        text: item.text,
        mediaType: item.mediaType,
        ts: item.ts,
        risk: a.risk,
        level: a.level,
        categories: a.categories,
        matches: a.matches,
        identifiers: a.identifiers,
        reasons: a.reasons,
        imageLabels: []
      });
    }

    return res.json({ ok: true });
  }

  res.status(405).send('Method Not Allowed');
};