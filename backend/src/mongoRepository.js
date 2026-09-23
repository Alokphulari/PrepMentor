import { MongoClient } from "mongodb";

let connection;
export function createMongoRepository(collection) {
  return {
    findUserById: (id) => collection.findOne({ id }, { projection: { _id: 0 } }),
    findUserByEmail: (email) => collection.findOne({ email: email.trim().toLowerCase() }, { projection: { _id: 0 } }),
    async createUser(user) {
      try { await collection.insertOne({ ...user, version: 0 }); return user; }
      catch (error) { if (error.code === 11000) throw Object.assign(new Error("An account with this email already exists."), { status: 409 }); throw error; }
    },
    async mutateUser(id, updater) {
      // Optimistic concurrency keeps independent API instances from losing updates.
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const current = await collection.findOne({ id }, { projection: { _id: 0 } });
        if (!current) return null;
        const updates = updater(current);
        const next = { ...current, ...updates, updatedAt: new Date().toISOString(), version: (current.version || 0) + 1 };
        const result = await collection.replaceOne({ id, version: current.version ?? { $exists: false } }, next);
        if (result.modifiedCount) return next;
      }
      throw Object.assign(new Error("Your data changed during this request. Please retry."), { status: 409 });
    },
  };
}
export async function mongoRepository() {
  if (!connection) {
    connection = (async () => {
      const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
      try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB_NAME || "prepmentor");
        const collection = db.collection("users");
        await collection.createIndex({ email: 1 }, { unique: true });
        await collection.createIndex({ id: 1 }, { unique: true });
        const repository = createMongoRepository(collection);
        const safeRepository = Object.fromEntries(Object.entries(repository).map(([name, operation]) => [name, async (...args) => {
          try { return await operation(...args); }
          catch (error) {
            if (error.status === 409) throw error;
            throw Object.assign(new Error("MongoDB could not complete this request. Please retry when storage is available."), { status: 503 });
          }
        }]));
        return { ...safeRepository, ping: () => db.command({ ping: 1 }) };
      } catch { await client.close(); connection = undefined; throw Object.assign(new Error("MongoDB is unavailable. Check the server database configuration."), { status: 503 }); }
    })();
  }
  return connection;
}
