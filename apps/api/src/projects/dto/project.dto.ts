import { createProjectSchema, updateProjectSchema } from '@portfolio/shared';
import { createZodDto } from 'nestjs-zod';

/**
 * The schemas themselves live in packages/shared so the admin panel
 * validates against the exact same rules the API enforces, instead of a
 * hand-kept copy that drifts.
 */
export class CreateProjectDto extends createZodDto(createProjectSchema) {}
export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}
