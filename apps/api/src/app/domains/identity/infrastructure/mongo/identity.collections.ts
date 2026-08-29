import type { Collection, Db } from 'mongodb';
import type { MongoDocument } from '../../../../platform/database/mongo-document';
import type { Session } from '../../domain/session.entity';
import type { User } from '../../domain/user.entity';

export type UserDocument = MongoDocument<User>;
export type SessionDocument = MongoDocument<Session>;

export const IDENTITY_COLLECTION_NAMES = {
  users: 'users',
  sessions: 'sessions',
} as const;

export interface IdentityCollections {
  users: Collection<UserDocument>;
  sessions: Collection<SessionDocument>;
}

export function getIdentityCollections(db: Db): IdentityCollections {
  return {
    users: db.collection<UserDocument>(IDENTITY_COLLECTION_NAMES.users),
    sessions: db.collection<SessionDocument>(
      IDENTITY_COLLECTION_NAMES.sessions,
    ),
  };
}
