import { MongoClient, type Collection, type Db, type Document, ObjectId } from 'mongodb';
import type { SpecDiffRunRepository } from '../../Application/ports/specDiffRunRepository';

export class MongoSpecDiffRunRepository implements SpecDiffRunRepository {
  private readonly client: MongoClient;
  private db?: Db;
  private collection?: Collection<Document>;

  constructor(
    private readonly cfg: {
      mongoUri: string;
      dbName: string;
      collection: string;
    },
  ) {
    this.client = new MongoClient(cfg.mongoUri);
  }

  private async getCollection(): Promise<Collection<Document>> {
    if (this.collection) {
      return this.collection;
    }
    await this.client.connect();
    this.db = this.client.db(this.cfg.dbName);
    this.collection = this.db.collection(this.cfg.collection);
    return this.collection;
  }

  async save(run: Record<string, unknown>): Promise<string> {
    const col = await this.getCollection();
    const res = await col.insertOne({
      ...run,
      createdAt: new Date(),
    });
    const id: ObjectId = res.insertedId as ObjectId;
    return id.toHexString();
  }
}

