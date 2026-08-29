export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
