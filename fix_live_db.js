const mongoose = require('mongoose');

// Replace this with your Live Server MongoDB URI
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/crm"; 

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully!");

    const db = mongoose.connection.db;
    const investorsCollection = db.collection('investors');

    const indexes = await investorsCollection.indexes();
    console.log("\nCurrent Indexes on 'investors' collection:");
    indexes.forEach(idx => console.log(` - ${idx.name}`));

    console.log("\nDropping unique indexes that cause the 11000 error...");

    const indexesToDrop = ["email_1", "phone_1", "debentureForm.applicationNo_1", "panNumber_1", "aadharNumber_1"];

    for (const indexName of indexesToDrop) {
      const exists = indexes.find(idx => idx.name === indexName);
      if (exists) {
        await investorsCollection.dropIndex(indexName);
        console.log(`✅ Successfully dropped index: ${indexName}`);
      } else {
        console.log(`ℹ️ Index not found (already dropped or never existed): ${indexName}`);
      }
    }

    console.log("\nDone! Please restart your live Next.js server.");
  } catch (error) {
    console.error("Error modifying database:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
