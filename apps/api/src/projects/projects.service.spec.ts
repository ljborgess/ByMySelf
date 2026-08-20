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
    applyOrdering: jest.Mock;
    findPublished: jest.Mock;
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
      applyOrdering: jest.fn().mockResolvedValue(undefined),
      findPublished: jest.fn().mockResolvedValue([]),
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

  describe('public reads', () => {
    it('returns the published listing with fields resolved for the locale', async () => {
      repository.findPublished.mockResolvedValue([
        projectRow({
          id: 'one',
          title: { pt: 'Primeiro', en: 'First' },
          description: { pt: 'Descrição' },
          content: { pt: 'Conteúdo' },
        }),
      ]);

      const [project] = await service.findPublished('en');

      expect(project.title).toBe('First');
      // half-translated is the common case; each field falls back on its own
      expect(project.description).toBe('Descrição');
    });

    it('reads from the published scope, which excludes archived and deleted', async () => {
      repository.findPublished.mockResolvedValue([]);

      await service.findPublished('pt');

      // the scoping lives in the repository query, so the service must not
      // reach for the unscoped listing here
      expect(repository.findPublished).toHaveBeenCalledTimes(1);
      expect(repository.findAll).not.toHaveBeenCalled();
    });

    it('preserves the order the repository returned', async () => {
      repository.findPublished.mockResolvedValue([
        projectRow({ id: 'second', slug: 'b', order: 0 }),
        projectRow({ id: 'first', slug: 'a', order: 1 }),
      ]);

      const listing = await service.findPublished('pt');

      expect(listing.map((project) => project.id)).toEqual(['second', 'first']);
    });

    it('never leaks the soft-delete column to the public shape', async () => {
      repository.findPublished.mockResolvedValue([projectRow()]);

      const [project] = await service.findPublished('pt');

      expect(project).not.toHaveProperty('deletedAt');
    });

    it('returns a project by slug with the locale applied', async () => {
      repository.findBySlug.mockResolvedValue(
        projectRow({ title: { pt: 'Olá', en: 'Hello' } }),
      );

      const project = await service.findPublishedBySlug('meu-projeto', 'en');

      expect(project.title).toBe('Hello');
    });

    it('raises 404 for an unknown slug rather than throwing something unhandled', async () => {
      repository.findBySlug.mockResolvedValue(undefined);

      await expect(
        service.findPublishedBySlug('nao-existe', 'pt'),
      ).rejects.toThrow(NotFoundException);
    });

    it('raises the same 404 for a soft-deleted slug, revealing nothing', async () => {
      // the repository's default scoping hides it, so the service cannot
      // tell this apart from a slug that never existed -- which is the point
      repository.findBySlug.mockResolvedValue(undefined);

      await expect(
        service.findPublishedBySlug('excluido', 'pt'),
      ).rejects.toThrow(NotFoundException);
    });

    it('serves an archived project by direct link even though it is unlisted', async () => {
      repository.findBySlug.mockResolvedValue(
        projectRow({ status: 'archived' }),
      );

      const project = await service.findPublishedBySlug('arquivado', 'pt');

      // archived means unlisted, not gone: 404-ing an already-indexed URL
      // would be worse than serving it
      expect(project.status).toBe('archived');
    });
  });

  describe('reorder', () => {
    /** Three live projects, plus one soft-deleted that must stay invisible. */
    function seedListing() {
      const live = [
        projectRow({ id: 'first', slug: 'primeiro', order: 0 }),
        projectRow({ id: 'second', slug: 'segundo', order: 1 }),
        projectRow({ id: 'third', slug: 'terceiro', order: 2 }),
      ];
      // findAll applies the soft-delete scoping, so the deleted project
      // never reaches the service at all
      repository.findAll.mockResolvedValue(live);
      return live;
    }

    /** The sequence the service asked the repository to persist. */
    function persistedOrdering(): string[] {
      const typed = repository.applyOrdering as jest.Mock<
        Promise<void>,
        [string[]]
      >;
      return typed.mock.calls[0][0];
    }

    it('moves a project to the front, reindexing the rest', async () => {
      seedListing();

      await service.reorder('third', 0);

      expect(persistedOrdering()).toEqual(['third', 'first', 'second']);
    });

    it('moves a project to the back, reindexing the rest', async () => {
      seedListing();

      await service.reorder('first', 2);

      expect(persistedOrdering()).toEqual(['second', 'third', 'first']);
    });

    it('moves a project to a middle position', async () => {
      seedListing();

      await service.reorder('third', 1);

      expect(persistedOrdering()).toEqual(['first', 'third', 'second']);
    });

    it('clamps a position past the end instead of failing', async () => {
      seedListing();

      await service.reorder('first', 99);

      expect(persistedOrdering()).toEqual(['second', 'third', 'first']);
    });

    it('persists a contiguous sequence with no duplicate positions', async () => {
      const live = seedListing();

      await service.reorder('second', 0);

      const ordering = persistedOrdering();
      // the repository writes each id's index as its order, so a permutation
      // of the input is exactly what guarantees 0..n-1 with no collisions
      expect(ordering).toHaveLength(live.length);
      expect(new Set(ordering).size).toBe(live.length);
    });

    it('never includes a soft-deleted project in the reindex', async () => {
      const live = seedListing();
      const deleted = projectRow({ id: 'gone', deletedAt: new Date() });

      await service.reorder('first', 1);

      expect(persistedOrdering()).not.toContain(deleted.id);
      expect(persistedOrdering()).toHaveLength(live.length);
    });

    it('raises 404 for a project that is missing or already deleted', async () => {
      seedListing();

      await expect(service.reorder('gone', 0)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.applyOrdering).not.toHaveBeenCalled();
    });

    it('returns the reordered listing, not just the moved project', async () => {
      seedListing();

      const result = await service.reorder('third', 0);

      expect(Array.isArray(result)).toBe(true);
      // read back after the write, so the caller sees persisted order values
      expect(repository.findAll).toHaveBeenCalledTimes(2);
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
