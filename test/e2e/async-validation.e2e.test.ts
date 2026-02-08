import { Objecter, FieldMapping } from '../../src';

class UserDto {
  username!: string;
  email!: string;
  role?: string;
}

// Simulated User DB Service
const userDb = {
  users: ['existing_user', 'admin'],
  async iUsernameTaken(username: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate DB latency
    return this.users.includes(username);
  },
  async isDomainBlacklisted(domain: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return domain === 'spam.com';
  },
};

describe('E2E: Async Validation Pipeline', () => {
  beforeEach(() => {
    Objecter.resetConfig();
    Objecter.clearProfiles();
  });

  it('should handle complex registration validation flow', async () => {
    // Scenario: Registering a new user
    // 1. Username must not be taken (Async)
    // 2. Email must be valid format (Sync)
    // 3. Schema: If role is admin, email must be @company.com (Async/Sync hybrid logic)

    const uniqueUsernameCheck = async (username: string) => {
      const taken = await userDb.iUsernameTaken(username);
      return taken ? { valid: false, errors: ['Username already taken'] } : { valid: true };
    };

    const emailFormatCheck = (email: string) => {
      return email.includes('@') ? { valid: true } : { valid: false, errors: ['Invalid email format'] };
    };

    const businessRuleCheck = async (target: UserDto) => {
      if (target.role === 'admin' && !target.email.endsWith('@company.com')) {
        return { valid: false, errors: ['Admins must use company email'] };
      }

      const domain = target.email.split('@')[1];
      if (await userDb.isDomainBlacklisted(domain)) {
        return { valid: false, errors: ['Email domain is blacklisted'] };
      }

      return { valid: true };
    };

    const mapping: FieldMapping[] = [
      { from: 'username', to: 'username', validateAsync: uniqueUsernameCheck },
      { from: 'email', to: 'email', validate: emailFormatCheck },
      { from: 'role', to: 'role' },
    ];

    // Case 1: Valid Registration
    const validData = { username: 'new_user', email: 'new@company.com', role: 'user' };
    const validResult = await Objecter.convertAsync<typeof validData, UserDto>(validData, UserDto, mapping, {
      validateSchemaAsync: businessRuleCheck as any,
    });
    expect(validResult.username).toBe('new_user');

    // Case 2: Username Taken
    const takenData = { username: 'existing_user', email: 'new@company.com', role: 'user' };
    await expect(
      Objecter.convertAsync(takenData, UserDto, mapping, { validateSchemaAsync: businessRuleCheck as any }),
    ).rejects.toThrow('Username already taken');

    // Case 3: Admin with wrong email (Schema Validation)
    const invalidAdminData = { username: 'new_admin', email: 'admin@gmail.com', role: 'admin' };
    await expect(
      Objecter.convertAsync(invalidAdminData, UserDto, mapping, { validateSchemaAsync: businessRuleCheck as any }),
    ).rejects.toThrow('Admins must use company email');

    // Case 4: Blacklisted domain (Async Schema Validation)
    const blacklistedData = { username: 'spammer', email: 'spam@spam.com', role: 'user' };
    await expect(
      Objecter.convertAsync(blacklistedData, UserDto, mapping, { validateSchemaAsync: businessRuleCheck as any }),
    ).rejects.toThrow('Email domain is blacklisted');
  });
});
