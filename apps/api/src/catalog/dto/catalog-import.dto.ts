import { IsNotEmpty, IsString } from 'class-validator';

export class CatalogImportPreviewDto {
  @IsString()
  @IsNotEmpty()
  csv!: string;
}
