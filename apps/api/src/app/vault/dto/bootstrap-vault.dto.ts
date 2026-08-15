import { IsBase64, IsIn, IsInt, Max, MaxLength, Min } from 'class-validator';

export class BootstrapVaultDto {
  @IsInt()
  @IsIn([1])
  version!: number;

  @IsIn(['PBKDF2-SHA256'])
  kdfAlgorithm!: 'PBKDF2-SHA256';

  @IsInt()
  @Min(310_000)
  @Max(2_000_000)
  kdfIterations!: number;

  @IsBase64()
  @MaxLength(128)
  kdfSalt!: string;

  @IsIn(['AES-256-GCM'])
  wrapAlgorithm!: 'AES-256-GCM';

  @IsBase64()
  @MaxLength(64)
  wrapNonce!: string;

  @IsBase64()
  @MaxLength(256)
  wrappedKey!: string;
}
