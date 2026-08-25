import { assertNoSuperuserInProduction } from './assert-role-privilege';

function poolWith(rolsuper: boolean) {
  return {
    query: jest.fn().mockResolvedValue({ rows: [{ rolsuper }] }),
  };
}

describe('assertNoSuperuserInProduction', () => {
  it('rejects a superuser role in production', async () => {
    await expect(
      assertNoSuperuserInProduction(poolWith(true), 'production'),
    ).rejects.toThrow(/superuser/i);
  });

  it('passes a restricted role in production', async () => {
    await expect(
      assertNoSuperuserInProduction(poolWith(false), 'production'),
    ).resolves.toBeUndefined();
  });

  it('does not interfere outside production, even with a superuser role', async () => {
    await expect(
      assertNoSuperuserInProduction(poolWith(true), 'development'),
    ).resolves.toBeUndefined();

    const pool = poolWith(true);
    await assertNoSuperuserInProduction(pool, 'development');
    // Nem chega a consultar pg_roles fora de produção -- a checagem não
    // tem motivo para tocar o banco quando o resultado não importa.
    expect(pool.query).not.toHaveBeenCalled();
  });
});
