/**
 * Repository for the users collection.
 * Handles user creation and lookups for authentication.
 * @module repositories/user
 */

import { Collection, Db, ObjectId, ClientSession } from "mongodb";

import { type UserDocument } from "../domain/entities/user.entity.js";

class UserRepository {
  private collection: Collection<UserDocument>;

  constructor(db: Db) {
    this.collection = db.collection<UserDocument>("users");
  }

  async findById(
    id: ObjectId,
    session?: ClientSession
  ): Promise<UserDocument | null> {
    return this.collection.findOne({ _id: id }, { session });
  }

  async findByEmail(
    email: string,
    session?: ClientSession
  ): Promise<UserDocument | null> {
    return this.collection.findOne(
      { email: { $eq: email } },
      { session }
    );
  }

  async create(
    data: Omit<UserDocument, "_id">,
    session?: ClientSession
  ): Promise<UserDocument> {
    const result = await this.collection.insertOne(
      data as UserDocument,
      { session }
    );

    return { ...data, _id: result.insertedId } as UserDocument;
  }
}

export { UserRepository };
