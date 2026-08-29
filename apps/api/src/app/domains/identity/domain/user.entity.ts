export type UserStatus = 'active' | 'disabled';

export interface User {
  id: string;
  name: string;
  email: string;
  emailNormalized: string;
  passwordHash: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}
