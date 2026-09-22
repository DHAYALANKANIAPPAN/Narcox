const { MongoClient } = require('mongodb');

async function getDb() {
  if (!global._mongo) {
    global._mongo = new MongoClient(process.env.MONGODB_URI).connect();
  }
  return (await global._mongo).db('narcox');
}

module.exports = { getDb };
