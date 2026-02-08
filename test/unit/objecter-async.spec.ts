import { Objecter, FieldMapping, MappingError, ValidationError as ObjValidationError } from '../../src';

class TargetDto {
  id!: number;
  name!: string;
  email!: string;
  role?: string;
  formattedName?: string;
}

// Helper to simulate async operation
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('Objecter Async Transform', () => {
  beforeEach(() => {
    Objecter.resetConfig();
    Objecter.clearProfiles();
  });

  describe('convertAsync', () => {
    it('should handle sync transforms normally', async () => {
      const source = { id: 1, name: 'john', email: 'john@test.com' };
      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', transform: (v: string) => v.toUpperCase() },
        { from: 'email', to: 'email' },
      ];

      const result = await Objecter.convertAsync(source, TargetDto, mapping);

      expect(result.id).toBe(1);
      expect(result.name).toBe('JOHN');
      expect(result.email).toBe('john@test.com');
    });

    it('should handle async transforms', async () => {
      const source = { id: 1, name: 'john', email: 'john@test.com' };
      const asyncTransform = async (v: string): Promise<string> => {
        await delay(1);
        return v.toUpperCase();
      };
      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', transform: asyncTransform },
        { from: 'email', to: 'email' },
      ];

      const result = await Objecter.convertAsync(source, TargetDto, mapping);

      expect(result.name).toBe('JOHN');
    });

    it('should handle multiple async transforms in single conversion', async () => {
      const source = { id: 1, name: 'john', email: 'john@test.com' };
      const asyncUppercase = async (v: string): Promise<string> => {
        await delay(1);
        return v.toUpperCase();
      };
      const asyncPrefix = async (v: string): Promise<string> => {
        await delay(1);
        return `PREFIX_${v}`;
      };
      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', transform: asyncUppercase },
        { from: 'email', to: 'email', transform: asyncPrefix },
      ];

      const result = await Objecter.convertAsync(source, TargetDto, mapping);

      expect(result.name).toBe('JOHN');
      expect(result.email).toBe('PREFIX_john@test.com');
    });

    it('should throw MappingError for null source', async () => {
      const mapping: FieldMapping[] = [{ from: 'id', to: 'id' }];

      await expect(Objecter.convertAsync(null, TargetDto, mapping)).rejects.toThrow(MappingError);
    });

    it('should propagate async transform errors', async () => {
      const source = { id: 1, name: 'john', email: 'john@test.com' };
      const failingTransform = async (): Promise<string> => {
        await delay(1);
        throw new Error('Async transform failed');
      };
      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', transform: failingTransform },
      ];

      await expect(Objecter.convertAsync(source, TargetDto, mapping)).rejects.toThrow('Async transform failed');
    });

    it('should work with validation after async transform', async () => {
      const source = { id: 1, name: '', email: 'john@test.com' };
      const asyncTransform = async (v: string): Promise<string> => {
        await delay(1);
        return v.trim();
      };
      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        {
          from: 'name',
          to: 'name',
          transform: asyncTransform,
          validate: (v: string) => ({ valid: v.length > 0, errors: v.length > 0 ? [] : ['Name is required'] }),
        },
        { from: 'email', to: 'email' },
      ];

      await expect(Objecter.convertAsync(source, TargetDto, mapping)).rejects.toThrow(ObjValidationError);
    });
  });

  describe('convertArrayAsync', () => {
    it('should convert array with async transforms', async () => {
      const sources = [
        { id: 1, name: 'john', email: 'john@test.com' },
        { id: 2, name: 'jane', email: 'jane@test.com' },
      ];
      const asyncTransform = async (v: string): Promise<string> => {
        await delay(1);
        return v.toUpperCase();
      };
      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', transform: asyncTransform },
        { from: 'email', to: 'email' },
      ];

      const results = await Objecter.convertArrayAsync(sources, TargetDto, mapping);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('JOHN');
      expect(results[1].name).toBe('JANE');
    });

    it('should throw MappingError with index for array item errors', async () => {
      const sources = [
        { id: 1, name: 'john', email: 'john@test.com' },
        { name: 'jane', email: 'jane@test.com' }, // missing required id
      ];
      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
      ];

      await expect(Objecter.convertArrayAsync(sources, TargetDto, mapping)).rejects.toThrow(/index 1/);
    });

    it('should throw MappingError for non-array input', async () => {
      const notArray = { id: 1 } as unknown as unknown[];
      const mapping: FieldMapping[] = [{ from: 'id', to: 'id' }];

      await expect(Objecter.convertArrayAsync(notArray, TargetDto, mapping)).rejects.toThrow(MappingError);
    });
  });

  describe('mapAsync', () => {
    it('should map using registered profile with async transform', async () => {
      const asyncTransform = async (v: string): Promise<string> => {
        await delay(1);
        return v.toUpperCase();
      };

      Objecter.registerProfile({
        name: 'UserProfile',
        targetClass: TargetDto,
        mapping: [
          { from: 'id', to: 'id' },
          { from: 'name', to: 'name', transform: asyncTransform },
          { from: 'email', to: 'email' },
        ],
      });

      const source = { id: 1, name: 'john', email: 'john@test.com' };
      const result = await Objecter.mapAsync<TargetDto>(source, 'UserProfile');

      expect(result.name).toBe('JOHN');
    });

    it('should throw MappingError for non-existent profile', async () => {
      const source = { id: 1 };

      await expect(Objecter.mapAsync(source, 'NonExistentProfile')).rejects.toThrow(MappingError);
    });
  });

  describe('mixed sync and async transforms', () => {
    it('should handle mixed transforms correctly', async () => {
      const source = { id: 1, name: 'john', email: 'john@test.com' };
      const syncTransform = (v: string): string => v.toUpperCase();
      const asyncTransform = async (v: string): Promise<string> => {
        await delay(1);
        return `PREFIX_${v}`;
      };
      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', transform: syncTransform },
        { from: 'email', to: 'email', transform: asyncTransform },
      ];

      const result = await Objecter.convertAsync(source, TargetDto, mapping);

      expect(result.name).toBe('JOHN');
      expect(result.email).toBe('PREFIX_john@test.com');
    });
  });
});
