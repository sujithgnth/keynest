import { IsBase64, IsInt, IsIn, MaxLength, Min } from 'class-validator';

export class UpdateCredentialDto {
  @IsInt()
  @Min(1)
  expectedRevision!: number;

  @IsInt()
  @IsIn([1])
  envelopeVersion!: 1;

  @IsBase64()
  @MaxLength(64)
  nonce!: string;

  @IsBase64()
  @MaxLength(180_000)
  ciphertext!: string;
}
