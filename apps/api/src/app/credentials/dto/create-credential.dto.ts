import { IsBase64, IsIn, IsInt, IsUUID, MaxLength } from 'class-validator';

export const ITEM_TYPES = ['login', 'note', 'card', 'api-key'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export class CreateCredentialDto {
  @IsUUID()
  id!: string;

  @IsIn(ITEM_TYPES)
  itemType!: ItemType;

  @IsInt()
  @IsIn([1])
  envelopeVersion!: number;

  @IsBase64()
  @MaxLength(64)
  nonce!: string;

  @IsBase64()
  @MaxLength(180_000)
  ciphertext!: string;
}
