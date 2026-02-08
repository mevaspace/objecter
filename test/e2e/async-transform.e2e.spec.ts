import { Objecter, FieldMapping } from '../../src';

class EnrichedUser {
  id!: number;
  name!: string;
  email!: string;
  role!: string;
  department!: string;
  displayName!: string;
}

// Simulated external services
const roleService = {
  async getRole(userId: number): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 10));
    const roles: Record<number, string> = { 1: 'admin', 2: 'user' };
    return roles[userId] || 'guest';
  },
};

const departmentService = {
  async getDepartment(userId: number): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 10));
    const depts: Record<number, string> = { 1: 'Engineering', 2: 'Marketing' };
    return depts[userId] || 'General';
  },
};

describe('E2E: Async Transform Pipeline', () => {
  beforeEach(() => {
    Objecter.resetConfig();
    Objecter.clearProfiles();
  });

  it('should complete full async enrichment pipeline', async () => {
    const rawUserData = [
      { id: 1, name: 'John Doe', email: 'john@company.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@company.com' },
    ];

    const mapping: FieldMapping[] = [
      { from: 'id', to: 'id' },
      { from: 'name', to: 'name' },
      { from: 'email', to: 'email' },
      { from: 'id', to: 'role', transform: async (id: number) => roleService.getRole(id) },
      { from: 'id', to: 'department', transform: async (id: number) => departmentService.getDepartment(id) },
      {
        from: 'name',
        to: 'displayName',
        transform: async (name: string) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return `[User] ${name}`;
        },
      },
    ];

    const enrichedUsers = await Objecter.convertArrayAsync(rawUserData, EnrichedUser, mapping);

    // Verify first user
    expect(enrichedUsers[0].id).toBe(1);
    expect(enrichedUsers[0].name).toBe('John Doe');
    expect(enrichedUsers[0].role).toBe('admin');
    expect(enrichedUsers[0].department).toBe('Engineering');
    expect(enrichedUsers[0].displayName).toBe('[User] John Doe');

    // Verify second user
    expect(enrichedUsers[1].id).toBe(2);
    expect(enrichedUsers[1].name).toBe('Jane Smith');
    expect(enrichedUsers[1].role).toBe('user');
    expect(enrichedUsers[1].department).toBe('Marketing');
    expect(enrichedUsers[1].displayName).toBe('[User] Jane Smith');
  });

  it('should work with profile-based async mapping', async () => {
    Objecter.registerProfile({
      name: 'EnrichedUserProfile',
      targetClass: EnrichedUser,
      mapping: [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email' },
        { from: 'id', to: 'role', transform: async (id: number) => roleService.getRole(id) },
        { from: 'id', to: 'department', transform: async (id: number) => departmentService.getDepartment(id) },
        {
          from: 'name',
          to: 'displayName',
          transform: (name: string) => `${name}`, // Sync transform
        },
      ],
    });

    const userData = { id: 1, name: 'Test User', email: 'test@test.com' };
    const result = await Objecter.mapAsync<EnrichedUser>(userData, 'EnrichedUserProfile');

    expect(result.role).toBe('admin');
    expect(result.department).toBe('Engineering');
    expect(result).toBeInstanceOf(EnrichedUser);
  });

  it('should handle validation after async transforms', async () => {
    const mapping: FieldMapping[] = [
      { from: 'id', to: 'id' },
      { from: 'name', to: 'name' },
      { from: 'email', to: 'email' },
      {
        from: 'id',
        to: 'role',
        transform: async (id: number) => roleService.getRole(id),
        validate: (role: string) => ({
          valid: role === 'admin',
          errors: !role || role !== 'admin' ? ['Only admin users allowed'] : [],
        }),
      },
      { from: 'id', to: 'department', transform: () => Promise.resolve('Default') },
      { from: 'name', to: 'displayName' },
    ];

    // User with id 1 is admin - should pass
    const adminData = { id: 1, name: 'Admin', email: 'admin@test.com' };
    const adminResult = await Objecter.convertAsync(adminData, EnrichedUser, mapping);
    expect(adminResult.role).toBe('admin');

    // User with id 2 is not admin - should fail validation
    const userData = { id: 2, name: 'User', email: 'user@test.com' };
    await expect(Objecter.convertAsync(userData, EnrichedUser, mapping)).rejects.toThrow('Only admin users allowed');
  });
});
