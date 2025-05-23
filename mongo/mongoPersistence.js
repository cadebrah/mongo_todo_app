const { MongoClient, ObjectId } = require('mongodb');

class MongoPersistence {
  constructor(config) {
    this.client = new MongoClient(config.uri);
    this.dbName = config.name;
  }

  async init() {
    await this.client.connect();
    this.database = this.client.db(this.dbName);
  }

  async close() {
    await this.client.close();
  }

  async update(updateEvent) {
    const { table, data } = updateEvent;
    const collection = this.database.collection(table);
    const filter = { _id: new ObjectId(data.id) };
    
    // Remove id from data to avoid overwriting _id in MongoDB
    const { id, ...updateData } = data;
    const updateDoc = { $set: updateData };
    
    await collection.updateOne(filter, updateDoc);
  }

  async upsert(updateEvent) {
    const { table, data } = updateEvent;
    const collection = this.database.collection(table);
    const filter = { _id: new ObjectId(data.id) };
    
    // Remove id from data to avoid overwriting _id in MongoDB
    const { id, ...updateData } = data;
    const updateDoc = { $set: updateData };
    
    await collection.updateOne(filter, updateDoc, { upsert: true });
  }

  async delete(updateEvent) {
    const { table, data } = updateEvent;
    const collection = this.database.collection(table);
    const filter = { _id: new ObjectId(data.id) };
    await collection.deleteOne(filter);
  }
}

module.exports = MongoPersistence;