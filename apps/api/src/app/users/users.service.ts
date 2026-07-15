import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserDocument } from './schemas/user.schema';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

interface MongoDuplicateKeyError {
  code?: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<PublicUser> {
    const emailNormalized = this.normalizeEmail(createUserDto.email);

    try {
      const user = await this.userModel.create({
        name: createUserDto.name.trim(),
        email: emailNormalized,
        emailNormalized,
        passwordHash: createUserDto.passwordHash,
      });

      return this.toPublicUser(user);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Email is already registered');
      }

      throw error;
    }
  }

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  toPublicUser(user: Pick<UserDocument, '_id' | 'name' | 'email'>): PublicUser {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as MongoDuplicateKeyError).code === 11000
    );
  }

  findByEmailWithPasswordHash(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ emailNormalized: this.normalizeEmail(email) })
      .select('+passwordHash')
      .exec();
  }
}
