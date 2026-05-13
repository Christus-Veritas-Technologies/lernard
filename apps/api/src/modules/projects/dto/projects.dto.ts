import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class ProjectStudentInfoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  fullName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  schoolName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  candidateNumber!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  centreNumber!: string;
}

class EditProjectSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(140)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

export class CreateProjectDraftDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  subject!: string;

  @IsIn(['grade7', 'olevel', 'alevel'])
  level!: 'grade7' | 'olevel' | 'alevel';

  @ValidateNested()
  @Type(() => ProjectStudentInfoDto)
  studentInfo!: ProjectStudentInfoDto;
}

export class UpdateProjectDraftDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  subject?: string;

  @IsOptional()
  @IsIn(['grade7', 'olevel', 'alevel'])
  level?: 'grade7' | 'olevel' | 'alevel';

  @IsOptional()
  studentInfo?: {
    fullName: string;
    schoolName: string;
    candidateNumber: string;
    centreNumber: string;
  };
}

export class GenerateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  draftId!: string;

  @IsUUID()
  idempotencyKey!: string;
}

export class EditProjectPdfDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ValidateNested({ each: true })
  @Type(() => EditProjectSectionDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  sections!: EditProjectSectionDto[];
}


