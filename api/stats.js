const { getDb } = require('../lib/db');

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalAlerts = await db.collection('detections').countDocuments({ risk: { $gte: 7 }, ts: { $gte: thirtyDaysAgo } });
    const evidencePackages = await db.collection('evidence').countDocuments();
    
    const highRiskEntitiesArray = await db.collection('detections').distinct('userId', { risk: { $gte: 7 } });
    const highRiskEntities = highRiskEntitiesArray.length;
    
    const detections30d = await db.collection('detections').countDocuments({ ts: { $gte: thirtyDaysAgo } });
    const highRisk = totalAlerts; 

    const byTypePipeline = [
      { $match: { ts: { $gte: thirtyDaysAgo } } },
      { $group: { _id: "$mediaType", count: { $sum: 1 } } }
    ];
    const byTypeResults = await db.collection('detections').aggregate(byTypePipeline).toArray();
    const byType = {};
    byTypeResults.forEach(r => { byType[r._id || 'unknown'] = r.count; });

    const recent = await db.collection('detections').find().sort({ ts: -1 }).limit(5).toArray();

    res.status(200).json({
      totalAlerts,
      evidencePackages,
      highRiskEntities,
      detections30d,
      highRisk,
      byType,
      recent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
