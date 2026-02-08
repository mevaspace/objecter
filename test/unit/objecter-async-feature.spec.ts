import { Objecter, FieldMapping, MappingContext } from '../../src';

class UserWithRole {
  id!: number;
  name!: string;
  email!: string;
  role!: string;
  department?: string;
  permissions?: string[];
}

// Simulated API responses
const mockRoleDatabase: Record<number, string> = { 1: 'admin', 2: 'user', 3: 'moderator' };

const mockDepartmentDatabase: Record<number, string> = { 1: 'Engineering', 2: 'Marketing', 3: 'Operations' };

const mockPermissionsDatabase: Record<string, string[]> = {
  admin: ['read', 'write', 'delete', 'admin'],
  user: ['read'],
  moderator: ['read', 'write'],
};

describe('Objecter Async Feature Tests', () => {
  beforeEach(() => {
    Objecter.resetConfig();
    Objecter.clearProfiles();
  });

  describe('API call simulation', () => {
    it('should transform using simulated API lookup', async () => {
      const fetchRole = async (userId: number): Promise<string> => {
        // Simulating API delay
        await new Promise((resolve) => setTimeout(resolve, 10));
        return mockRoleDatabase[userId] || 'unknown';
      };

      const source = { id: 1, name: 'John Admin', email: 'john@test.com' };
      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email' },
        { from: 'id', to: 'role', transform: fetchRole },
      ];

      const result = await Objecter.convertAsync(source, UserWithRole, mapping);

      expect(result.role).toBe('admin');
    });

    it('should handle chained async lookups', async () => {
      const fetchRole = async (userId: number): Promise<string> => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return mockRoleDatabase[userId] || 'unknown';
      };

      const fetchPermissions = async (role: string): Promise<string[]> => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return mockPermissionsDatabase[role] || [];
      };

      const source = { id: 1, name: 'John Admin', email: 'john@test.com' };

      // First pass: get role
      const roleMapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email' },
        { from: 'id', to: 'role', transform: fetchRole },
      ];

      const withRole = await Objecter.convertAsync(source, UserWithRole, roleMapping);
      expect(withRole.role).toBe('admin');

      // Second pass: get permissions based on role
      const permMapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email' },
        { from: 'role', to: 'role' },
        { from: 'role', to: 'permissions', transform: fetchPermissions },
      ];

      const withPermissions = await Objecter.convertAsync(withRole, UserWithRole, permMapping);
      expect(withPermissions.permissions).toEqual(['read', 'write', 'delete', 'admin']);
    });
  });

  describe('database lookup simulation', () => {
    it('should enrich data with simulated database lookup', async () => {
      const fetchDepartment = async (userId: number): Promise<string> => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return mockDepartmentDatabase[userId] || 'Unknown';
      };

      const sources = [
        { id: 1, name: 'John', email: 'john@test.com' },
        { id: 2, name: 'Jane', email: 'jane@test.com' },
        { id: 3, name: 'Bob', email: 'bob@test.com' },
      ];

      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email' },
        { from: 'id', to: 'role', transform: () => Promise.resolve('user') },
        { from: 'id', to: 'department', transform: fetchDepartment },
      ];

      const results = await Objecter.convertArrayAsync(sources, UserWithRole, mapping);

      expect(results[0].department).toBe('Engineering');
      expect(results[1].department).toBe('Marketing');
      expect(results[2].department).toBe('Operations');
    });
  });

  describe('context passing in async transforms', () => {
    it('should pass context to async transform', async () => {
      const asyncTransformWithContext = async (
        value: string,
        _source: unknown,
        context?: MappingContext,
      ): Promise<string> => {
        const rawPrefix = context?.data?.prefix;
        const prefix = typeof rawPrefix === 'string' ? rawPrefix : '';
        return await Promise.resolve(`${prefix}${value}`);
      };

      const source = { id: 1, name: 'john', email: 'john@test.com' };
      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', transform: asyncTransformWithContext },
        { from: 'email', to: 'email' },
        { from: 'id', to: 'role', transform: () => Promise.resolve('user') },
      ];

      const result = await Objecter.convertAsync(source, UserWithRole, mapping, { context: { prefix: 'USER_' } });

      expect(result.name).toBe('USER_john');
    });
  });

  describe('error handling in async context', () => {
    it('should handle timeout simulation', async () => {
      const timeoutTransform = async (): Promise<string> => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        throw new Error('Request timeout');
      };

      const source = { id: 1, name: 'john', email: 'john@test.com' };
      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'id', to: 'role', transform: timeoutTransform },
      ];

      await expect(Objecter.convertAsync(source, UserWithRole, mapping)).rejects.toThrow('Request timeout');
    });

    it('should handle rejection properly', async () => {
      const rejectingTransform = async (): Promise<string> => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Rejected');
      };

      const source = { id: 1, name: 'john', email: 'john@test.com' };
      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'id', to: 'role', transform: rejectingTransform },
      ];

      await expect(Objecter.convertAsync(source, UserWithRole, mapping)).rejects.toThrow('Rejected');
    });
  });
});
