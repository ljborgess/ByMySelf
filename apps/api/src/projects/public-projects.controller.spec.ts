import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import type { PinnedRepo } from '@portfolio/shared';
import {
  PUBLIC_READ_THROTTLE_LIMIT,
  PUBLIC_READ_THROTTLE_NAME,
  PUBLIC_READ_THROTTLE_TTL_MS,
} from '../common/throttle.constants';
import { PublicProjectsController } from './public-projects.controller';
import { ProjectsService } from './projects.service';

describe('PublicProjectsController', () => {
  let controller: PublicProjectsController;
  let findPinnedRepos: jest.Mock;

  beforeEach(async () => {
    findPinnedRepos = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: PUBLIC_READ_THROTTLE_NAME,
            ttl: PUBLIC_READ_THROTTLE_TTL_MS,
            limit: PUBLIC_READ_THROTTLE_LIMIT,
          },
        ]),
      ],
      controllers: [PublicProjectsController],
      providers: [{ provide: ProjectsService, useValue: { findPinnedRepos } }],
    }).compile();

    controller = module.get(PublicProjectsController);
  });

  it('returns the pinned repos from the service', async () => {
    const repos: PinnedRepo[] = [
      {
        name: 'bymyself',
        description: 'Personal portfolio',
        url: 'https://github.com/ljborgess/bymyself',
        homepageUrl: null,
        imageUrl: 'https://opengraph.githubassets.com/1/ljborgess/bymyself',
        techStack: ['TypeScript'],
      },
    ];
    findPinnedRepos.mockResolvedValue(repos);

    await expect(controller.findAll()).resolves.toEqual(repos);
  });
});
