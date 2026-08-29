export type MongoDocument<T extends { id: string }> = Omit<T, 'id'> & {
  _id: string;
};
