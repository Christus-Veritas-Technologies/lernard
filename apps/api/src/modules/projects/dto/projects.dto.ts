import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsObject,
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
  @MaxLength(40)
  className!: string;
}

class ProjectContextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  community!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  problemStatement!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  availableResources!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  preferredLanguage?: string;
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
  @MaxLength(64)
  templateId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  subject!: string;

  @IsIn(['grade7', 'olevel', 'alevel'])
  level!: 'grade7' | 'olevel' | 'alevel';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  topicHint?: string;

  @ValidateNested()
  @Type(() => ProjectStudentInfoDto)
  studentInfo!: ProjectStudentInfoDto;

  @ValidateNested()
  @Type(() => ProjectContextDto)
  context!: ProjectContextDto;
}

export class UpdateProjectDraftDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  templateId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  subject?: string;

  @IsOptional()
  @IsIn(['grade7', 'olevel', 'alevel'])
  level?: 'grade7' | 'olevel' | 'alevel';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  topicHint?: string;

  @IsOptional()
  @IsObject()
  studentInfo?: {
    fullName: string;
    schoolName: string;
    candidateNumber: string;
    className: string;
  };

  @IsOptional()
  @IsObject()
  context?: {
    community: string;
    problemStatement: string;
    availableResources: string;
    preferredLanguage?: string;
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

export class ProjectTemplatesQueryDto {
  @IsOptional()
  @IsIn(['grade7', 'olevel', 'alevel'])
  level?: 'grade7' | 'olevel' | 'alevel';
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
