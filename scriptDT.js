const { MongoClient } = require('mongodb');

const DB1 = 'mongodb+srv://dbuser_mongo:RoseChina4312@cluster1.opga7.mongodb.net/oauth?retryWrites=true&w=majority';
const DB2 = 'mongodb+srv://root:root@servicely.gbsj2mk.mongodb.net/Servicely?retryWrites=true&w=majority';

async function transferData() {
    const sourceClient = new MongoClient(DB1);
    const targetClient = new MongoClient(DB2);

    try {
        await sourceClient.connect();
        await targetClient.connect();
        console.log('Connected to both source and target databases');

        const adminDb = sourceClient.db().admin();
        const dbs = await adminDb.listDatabases();
        
        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            const sourceDb = sourceClient.db(dbName);
            const targetDb = targetClient.db(dbName);

            const collections = await sourceDb.listCollections().toArray();
            
            for (const collection of collections) {
                const collectionName = collection.name;
                const sourceCollection = sourceDb.collection(collectionName);
                
                const documents = await sourceCollection.find({}).toArray();
                
                if (documents.length > 0) { 
                    const targetCollection = targetDb.collection(collectionName);
                    
                    try {
                        const targetCollections = await targetDb.listCollections({name: collectionName}).toArray();
                        if (targetCollections.length === 0) {
                            console.log(`Creating collection ${collectionName} in target database ${dbName}`);
                            await targetDb.createCollection(collectionName);
                        }
                        
                        const result = await targetCollection.insertMany(documents, { ordered: false });
                        console.log(`Copied ${result.insertedCount} documents to ${dbName}.${collectionName}`);
                    } catch (err) {
                        if (err.code === 11000) {
                            console.log(`Some documents in ${dbName}.${collectionName} already exist in target database`);
                        } else {
                            console.error(`Error copying ${dbName}.${collectionName}:`, err);
                        }
                    }
                }
            }
            console.log(`\n Database: ${dbName}`);
            collections.forEach(col => console.log(`  - ${col.name}`));
        }
    } catch (error) {
        console.error('Error during data transfer:', error);
    } finally {
        await sourceClient.close();
        await targetClient.close();
        console.log('Closed database connections');
    }
}

transferData().catch(console.error);
