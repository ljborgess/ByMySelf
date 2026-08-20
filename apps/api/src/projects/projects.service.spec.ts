import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createProjectSchema, updateProjectSchema } from '@portfolio/shared';
import { ProjectsRepository } from './projects.repository';
import { Project } from './projects.schema';
import { ProjectsService } from './projects.service';

/** A row as the database would hand it back. */
function projectRow(overrides: Partial<Project> = {}): Project {
  return {
    id: 'a3f6b7f0-1c2d-4e5f-9a8b-1234567890ab',
    title: { pt: 'Meu projeto' },
    description: { pt: 'Descrição' },
    content: { pt: '# Conteúdo' },
    slug: 'meu-projeto',
    techStack: ['NestJS'],
    repoUrl: null,
    demoUrl: null,
    coverImageUrl: null,
    status: 'in_progress',
    featured: false,
    order: 0,
    completedAt: null,
    deletedAt: null,
    createdAt: new Date('2026-08-01T10:00:00Z'),
    updatedAt: new Date('2026-08-01T10:00:00Z'),
    ...overrides,
  };
}

/** The minimum a caller must send, as the Zod schema would hand it over. */
function createInput(overrides: Record<string, unknown> = {}) {
  return createProjectSchema.parse({
    title: { pt: 'Meu projeto' },
    description: { pt: 'Descrição' },
    content: { pt: '# Conteúdo' },
    slug: 'meu-projeto',
    ...overrides,
  });
}

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repository: {
    findAll: jest.Mock;
    findById: jest.Mock;
    findBySlug: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    maxOrder: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(undefined),
      findBySlug: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((values: Project) => Promise.resolve(projectRow(values))),
      update: jest.fn((id: string, values: Partial<Project>) =>
        Promise.resolve(projectRow({ id, ...values })),
      ),
      softDelete: jest.fn(() =>
        Promise.resolve(projectRow({ deletedAt: new Date() })),
      ),
      maxOrder: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: ProjectsRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(ProjectsService);
  });

  describe('create', () => {
    it('creates a project from pt fields alone, leaving en unset', async () => {
      const created = await service.create(createInput());

      expect(created.title).toEqual({ pt: 'Meu projeto' });
      expect(created.title.en).toBeUndefined();
      expect(created.slug).toBe('meu-projeto');
    });

    it('accepts en alongside pt when a translation is ready', async () => {
      const created = await service.create(
        createInput({
          title: { pt: 'Meu projeto', en: 'My project' },
        }),
      );

      expect(created.title).toEqual({ pt: 'Meu projeto', en: 'My project' });
    });

    it('appends to the end of the manual ordering', async () => {
      repository.maxOrder.mockResolvedValue(7);

      const created = await service.create(createInput());

      expect(created.order).toBe(8);
    });

    it('starts ordering at 0 for the very first project', async () => {
      repository.maxOrder.mockResolvedValue(null);

      const created = await service.create(createInput());

      expect(created.order).toBe(0);
    });

    it('rejects a slug already taken by a live project', async () => {
      repository.findBySlug.mockResolvedValue(projectRow());

      await expect(service.create(createInput())).rejects.toThrow(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('explains where the slug went when it belongs to a deleted project', async () => {
      repository.findBySlug.mockResolvedValue(
        projectRow({ deletedAt: new Date() }),
      );

      // the constraint spans soft-deleted rows, so the admin would otherwise
      // hit a conflict with a project that appears nowhere in the panel
      await expect(service.create(createInput())).rejects.toThrow(
        /projeto excluído/i,
      );
    });
  });

  describe('update', () => {
    it('fills in a previously empty en translation', async () => {
      const updated = await service.update('some-id', {
        title: { pt: 'Meu projeto', en: 'My project' },
      });

      expect(updated.title).toEqual({ pt: 'Meu projeto', en: 'My project' });
    });

    it('patches a single field without touching the rest', async () => {
      const updated = await service.update('some-id', { featured: true });

      expect(updated.featured).toBe(true);
      expect(updated.slug).toBe('meu-projeto');
    });

    it('raises 404 when the project does not exist or is already deleted', async () => {
      repository.update.mockResolvedValue(undefined);

      await expect(
        service.update('missing-id', { featured: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows a project to keep its own slug on update', async () => {
      repository.findBySlug.mockResolvedValue(projectRow({ id: 'same-id' }));

      await expect(
        service.update('same-id', { slug: 'meu-projeto' }),
      ).resolves.toBeDefined();
    });

    it('rejects taking a slug that belongs to another project', async () => {
      repository.findBySlug.mockResolvedValue(projectRow({ id: 'other-id' }));

      await expect(
        service.update('this-id', { slug: 'meu-projeto' }),
      ).rejects.toThrow(ConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('skips the slug check entirely when slug is not being changed', async () => {
      await service.update('some-id', { featured: true });

      expect(repository.findBySlug).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('resolves when the project existed', async () => {
      await expect(service.softDelete('some-id')).resolves.toBeUndefined();
    });

    it('raises 404 on a second delete instead of overwriting the timestamp', async () => {
      repository.softDelete.mockResolvedValue(undefined);

      await expect(service.softDelete('some-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findById', () => {
    it('raises 404 rather than returning undefined', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(service.findById('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('schema validation, before the service is ever reached', () => {
    it('rejects a create missing the required pt title', () => {
      const result = createProjectSchema.safeParse({
        title: { en: 'Only English' },
        description: { pt: 'Descrição' },
        content: { pt: 'Conteúdo' },
        slug: 'meu-projeto',
      });

      expect(result.success).toBe(false);
    });

    it('rejects an empty en instead of storing a blank translation', () => {
      const result = createProjectSchema.safeParse({
        title: { pt: 'Título', en: '   ' },
        description: { pt: 'Descrição' },
        content: { pt: 'Conteúdo' },
        slug: 'meu-projeto',
      });

      expect(result.success).toBe(false);
    });

    it.each([
      'Meu-Projeto',
      'meu projeto',
      '-meu-projeto',
      'meu--projeto',
      'meu-projeto-',
      'acentuação',
    ])('rejects %s as a slug', (slug) => {
      expect(
        createProjectSchema.safeParse({ ...createInput(), slug }).success,
      ).toBe(false);
    });

    it('defaults techStack, status and featured when omitted', () => {
      const parsed = createInput();

      expect(parsed.techStack).toEqual([]);
      expect(parsed.status).toBe('in_progress');
      expect(parsed.featured).toBe(false);
    });

    it('rejects a coverImageUrl that is not a URL', () => {
      const result = createProjectSchema.safeParse({
        ...createInput(),
        coverImageUrl: 'nao-e-url',
      });

      expect(result.success).toBe(false);
    });

    it('lets the update schema omit every field', () => {
      expect(updateProjectSchema.safeParse({}).success).toBe(true);
    });

    // Zod's .partial() makes keys optional but keeps their defaults, so
    // deriving the update schema from the create one made every PATCH
    // re-apply techStack: [] and status: 'in_progress' -- silently wiping
    // fields the caller never mentioned.
    it('adds no defaults on update, so a patch touches only what it names', () => {
      const parsed = updateProjectSchema.parse({ featured: true });

      expect(parsed).toEqual({ featured: true });
      expect(parsed).not.toHaveProperty('techStack');
      expect(parsed).not.toHaveProperty('status');
    });

    it('leaves an empty update completely empty', () => {
      expect(updateProjectSchema.parse({})).toEqual({});
    });

    it('still requires pt on a field the update does include', () => {
      const result = updateProjectSchema.safeParse({
        title: { en: 'Only English' },
      });

      expect(result.success).toBe(false);
    });
  });
});
