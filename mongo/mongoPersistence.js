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

  // Helper method to parse JSON fields that should be arrays/objects
  parseJsonFields(data) {
    const parsedData = { ...data };
    
    // Parse 'notes' field if it's a string
    if (parsedData.notes && typeof parsedData.notes === 'string') {
      try {
        parsedData.notes = JSON.parse(parsedData.notes);
        console.log('Parsed notes field from string to array');
      } catch (error) {
        console.error('Failed to parse notes field:', error);
      }
    }
    
    // Add other fields that might need parsing here
    // For example, if you have other JSON string fields:
    // if (parsedData.settings && typeof parsedData.settings === 'string') {
    //   try {
    //     parsedData.settings = JSON.parse(parsedData.settings);
    //   } catch (error) {
    //     console.error('Failed to parse settings field:', error);
    //   }
    // }
    
    return parsedData;
  }

  async update(updateEvent) {
    const { table, data } = updateEvent;
    const collection = this.database.collection(table);
    const filter = { _id: new ObjectId(data.id) };
    
    // Remove id from data to avoid overwriting _id in MongoDB
    const { id, ...updateData } = data;
    
    // Parse JSON string fields before storing
    const parsedData = this.parseJsonFields(updateData);
    const updateDoc = { $set: parsedData };
    
    console.log('Update data being stored:', JSON.stringify(parsedData, null, 2));
    await collection.updateOne(filter, updateDoc);
  }

  async upsert(updateEvent) {
    const { table, data } = updateEvent;
    const collection = this.database.collection(table);
    const filter = { _id: new ObjectId(data.id) };
    // Remove id from data to avoid overwriting _id in MongoDB
    const { id, ...updateData } = data;
    
    // Parse JSON string fields before storing
    const parsedData = this.parseJsonFields(updateData);
    const updateDoc = { $set: parsedData };
    
    console.log('Upsert data being stored:', JSON.stringify(parsedData, null, 2));
    
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