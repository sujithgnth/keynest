import { IsBase64, IsInt, IsIn, MaxLength, Min } from 'class-validator';

export class UpdateVaultDto {
  @IsInt()
  @Min(1)
  expectedRevision!: number;

  @IsBase64()
  @MaxLength(64)
  wrapNonce!: string;

  @IsBase64()
  @MaxLength(256)
  wrappedKey!: string;

  @IsIn(['PBKDF2-SHA256'])
  kdfAlgorithm!: 'PBKDF2-SHA256';

  @IsInt()
  @Min(310_000)
  kdfIterations!: number;

  @IsBase64()
  @MaxLength(128)
  kdfSalt!: string;
}
