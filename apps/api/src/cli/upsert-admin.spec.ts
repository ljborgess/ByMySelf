import { upsertAdmin } from './upsert-admin';

describe('upsertAdmin', () => {
  let selectLimit: jest.Mock;
  let insertValues: jest.Mock;
  let updateSet: jest.Mock;
  let updateWhere: jest.Mock;
  let db: {
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    selectLimit = jest.fn().mockResolvedValue([]);
    insertValues = jest.fn().mockResolvedValue(undefined);
    updateWhere = jest.fn().mockResolvedValue(undefined);
    updateSet = jest.fn().mockReturnValue({ where: updateWhere });

    db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({ limit: selectLimit }),
      }),
      insert: jest.fn().mockReturnValue({ values: insertValues }),
      update: jest.fn().mockReturnValue({ set: updateSet }),
    };
  });

  it('creates the row when no admin exists yet', async () => {
    selectLimit.mockResolvedValue([]);

    const result = await upsertAdmin(
      db as never,
      'admin@example.com',
      'argon2id-hash-value',
    );

    expect(result).toBe('created');
    expect(insertValues).toHaveBeenCalledWith({
      email: 'admin@example.com',
      passwordHash: 'argon2id-hash-value',
    });
    expect(updateSet).not.toHaveBeenCalled();
  });

  it('updates the existing row instead of inserting a second one', async () => {
    selectLimit.mockResolvedValue([
      { id: 'existing-id', email: 'old@example.com' },
    ]);

    const result = await upsertAdmin(
      db as never,
      'new@example.com',
      'new-argon2id-hash-value',
    );

    expect(result).toBe('updated');
    expect(insertValues).not.toHaveBeenCalled();
    expect(updateSet).toHaveBeenCalledWith({
      email: 'new@example.com',
      passwordHash: 'new-argon2id-hash-value',
    });
    expect(updateWhere).toHaveBeenCalledTimes(1);
  });
});
