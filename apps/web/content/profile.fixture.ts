import type { Profile } from './profile';

/**
 * An empty-but-valid Profile for tests to spread over.
 *
 * Exists because every test that mocks the profile previously spelled out the
 * whole object, so adding a field to `Profile` broke all of them at once with
 * nothing to learn from the failure. Now a new field lands here and the tests
 * that do not care about it keep passing.
 *
 * Everything optional starts empty, so a test only states what it is actually
 * exercising.
 */
export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    name: 'Nome Sobrenome',
    headline: 'Headline de teste',
    bio: null,
    objective: null,
    photoUrl: null,
    cvUrl: null,
    skills: [],
    languages: [],
    education: [],
    certificates: [],
    links: { github: null, linkedin: null, email: null },
    ...overrides,
  };
}
