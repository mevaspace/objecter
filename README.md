# Objecter

**A lightweight, decorator-free object mapping library for TypeScript.**

Influenced by [MapStruct](https://mapstruct.org/) (Java), Objecter provides a functional, type-safe way to convert objects between different shapes (e.g., Entity to DTO) without polluting your classes with decorators.

## Status

- **Version**: 0.0.1-dev
- **Package**: `@mevaspace/objecter`
- **License**: MIT

## Why Objecter?

- **Zero Decorators**: Keep your domain entities clean. No need to add `@Expose` or `@Map` decorators to your business objects.
- **Type Safety**: Built with TypeScript in mind.
- **Functional Composition**: Use simple functions for transformations and validations.
- **Flexible**: Specific mappings where you need them, auto-mapping where you don't.
- **Zero Runtime Dependencies**: Lightweight and focused.

## Installation

```bash
# npm
npm install @mevaspace/objecter

# pnpm
pnpm add @mevaspace/objecter

# yarn
yarn add @mevaspace/objecter
```

## Usage

### 1. Basic Conversion

Define your source and target classes, then define the mapping.

```typescript
import { Objecter } from '@mevaspace/objecter';

class UserEntity {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

class UserDTO {
  id: number;
  fullName: string;
  email: string;
}

const user = new UserEntity();
user.id = 1;
user.firstName = 'John';
user.lastName = 'Doe';
user.email = 'john@example.com';

const mapping = [
  { from: 'id', to: 'id' },
  { from: 'email', to: 'email' },
  {
    from: 'firstName', // Source field is required for looking up context, but we can transform
    to: 'fullName',
    transform: (_, source: UserEntity) => `${source.firstName} ${source.lastName}`,
  },
];

const userDto = Objecter.convert(user, UserDTO, mapping);
console.log(userDto);
// Output: UserDTO { id: 1, email: 'john@example.com', fullName: 'John Doe' }
```

### 2. Validation and Transformation

Use built-in validators and transformers to sanitize and check data during conversion. The `validate` property accepts three types of validators:

1. **Predicate function** `(value) => boolean` - simple function that returns true/false
2. **ValidateFn** `(value, fieldName, context) => { valid: boolean, errors?: string[] }` - detailed validation result
3. **Zod schema** - any object with `safeParse` method (Zod compatible)

```typescript
import { Objecter, Validators, Transformers } from '@mevaspace/objecter';
import { z } from 'zod'; // Optional: if using Zod

const mapping = [
  {
    from: 'email',
    to: 'email',
    transform: Transformers.trim(),
    // Using built-in validator
    validate: Validators.pattern(/^.+@.+\..+$/),
  },
  {
    from: 'age',
    to: 'age',
    transform: Transformers.toNumber(),
    // Using predicate function
    validate: (age: number) => age >= 18 && age <= 100,
  },
  {
    from: 'username',
    to: 'username',
    // Using Zod schema (if zod is installed)
    validate: z.string().min(3).max(20),
  },
];
```

### 3. Nested Objects

Map complex nested structures using composable mappers.

```typescript
import { Objecter } from '@mevaspace/objecter';

class AddressEntity {
  street: string;
  city: string;
}

class UserEntity {
  id: number;
  address: AddressEntity;
}

class AddressDTO {
  streetAddress: string;
  cityName: string;
}

class UserDTO {
  id: number;
  location: AddressDTO;
}

// Create a reusable mapper for the nested object
const addressMapper = Objecter.createMapper(AddressDTO, [
  { from: 'street', to: 'streetAddress' },
  { from: 'city', to: 'cityName' },
]);

const mapping = [
  { from: 'id', to: 'id' },
  {
    from: 'address',
    to: 'location',
    // Use the created mapper as a transformer
    transform: addressMapper,
  },
];

const userDto = Objecter.convert(userEntity, UserDTO, mapping);
```

### 4. Reusable Mappers

Create a compiled mapper function for better performance and reuse.

```typescript
// Create once
const userMapper = Objecter.createMapper(UserDTO, mapping);

// Use everywhere
const dto1 = userMapper(user1);
const dto2 = userMapper(user2);

// Or for arrays
const userListMapper = Objecter.createArrayMapper(UserDTO, mapping);
const dtoList = userListMapper(users);
```

### 5. Auto Mapping

If your source and target share many property names, you can enable `autoMap` to automatically copy matching fields that aren't explicitly mapped.

```typescript
const dto = Objecter.convert(
  entity,
  Dto,
  [
    // Only map the fields that are DIFFERENT or require transformation
    { from: 'db_id', to: 'id' },
  ],
  { autoMap: true },
);
```

### 6. Conditional Mapping with Predicates

Use `skipIf` to conditionally skip field mapping based on custom logic. This is more flexible than `skipIfNull` as it allows you to define any condition.

```typescript
import { Objecter, type SkipIfPredicate } from '@mevaspace/objecter';

class UserEntity {
  name: string;
  email: string;
  role: string;
  internalNotes?: string;
}

class UserDTO {
  name: string;
  email?: string;
  internalNotes?: string;
}

// Skip email for admin users
const skipEmailForAdmin: SkipIfPredicate = (_value, source: any) => {
  return source.role === 'admin';
};

// Skip internal notes based on context
const skipInternalNotes: SkipIfPredicate = (_value, _source, context) => {
  return context.data?.publicView === true;
};

const mapping = [
  { from: 'name', to: 'name' },
  { from: 'email', to: 'email', skipIf: skipEmailForAdmin },
  { from: 'internalNotes', to: 'internalNotes', skipIf: skipInternalNotes },
];

const dto = Objecter.convert(user, UserDTO, mapping, { context: { publicView: true } });
```

### 7. Schema-Level Validation

Use `validateSchema` option to validate the entire target object after all field mappings are complete. This is useful for business rules that depend on multiple fields.

```typescript
import { Objecter, type SchemaValidateFn } from '@mevaspace/objecter';

class RegistrationDTO {
  username: string;
  internalCode: string;
  confirmCode: string;
  age: number;
}

// Validate code match and age requirement
const validateRegistration: SchemaValidateFn = (target: any) => {
  const errors: string[] = [];

  if (target.internalCode !== target.confirmCode) {
    errors.push('Code and confirm code must match');
  }

  if (target.age < 18) {
    errors.push('User must be at least 18 years old');
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
};

const mapping = [
  { from: 'username', to: 'username' },
  { from: 'internalCode', to: 'internalCode' },
  { from: 'confirmCode', to: 'confirmCode' },
  { from: 'age', to: 'age' },
];

try {
  const dto = Objecter.convert(source, RegistrationDTO, mapping, { validateSchema: validateRegistration });
} catch (error) {
  // ValidationError: Schema validation failed: Code and confirm code must match
}
```

### 8. Merging Objects

Merge multiple source objects into a single target instance. Later sources override earlier ones.

```typescript
const mergedDto = Objecter.merge([source1, source2], TargetDTO, mapping);
```

### 9. Plain Objects

Convert class instances to plain JavaScript objects (stripping prototypes), or simply pick/transform fields from an object.

```typescript
const plainObj = Objecter.toPlainObject(userEntity, mapping);
```

### 10. Global Configuration

Set default options that apply to all conversions globally. Useful for reducing boilerplate.

```typescript
import { Objecter } from '@mevaspace/objecter';

// Set global defaults
Objecter.configure({ autoMap: true, throwOnValidationError: false });

// All subsequent conversions use these defaults
const dto1 = Objecter.convert(source1, TargetDTO, mapping);
const dto2 = Objecter.convert(source2, TargetDTO, mapping);

// Per-call options still override global config
const dto3 = Objecter.convert(source3, TargetDTO, mapping, { autoMap: false });

// Reset to library defaults
Objecter.resetConfig();
```

### 11. Mapping Profiles

Register reusable mapping definitions by name. Profiles are validated at registration time.

```typescript
import { Objecter, type MappingProfile } from '@mevaspace/objecter';

// Register a profile
const userProfile = Objecter.registerProfile({
  name: 'UserToDto',
  targetClass: UserDTO,
  mapping: [
    { from: 'id', to: 'id' },
    { from: 'name', to: 'name' },
  ],
  options: { autoMap: true },
});

// Use by profile name
const dto = Objecter.map<UserDTO>(user, 'UserToDto');

// Type-safe name usage (using returned profile)
const dto2 = Objecter.map<UserDTO>(user, userProfile.name);

// Override profile options per-call
const dto3 = Objecter.map<UserDTO>(user, 'UserToDto', { autoMap: false });

// Clear all registered profiles
Objecter.clearProfiles();
```

> **Note**: If the profile name is not found, `Objecter.map()` throws a `MappingError`.

## API Overview

### Core Methods

- `Objecter.convert(source, TargetClass, mapping, options?)`: Convert a single object.
- `Objecter.convertArray(sourceArray, TargetClass, mapping, options?)`: Convert an array of objects.
- `Objecter.convertArrayGenerator(sourceArray, TargetClass, mapping, options?)`: Generator for processing large arrays lazyily.
- `Objecter.createMapper(TargetClass, mapping, options?)`: Create a reusable mapping function.
- `Objecter.createArrayMapper(TargetClass, mapping, options?)`: Create a reusable array mapping function.
- `Objecter.merge(sources, TargetClass, mapping, options?)`: Merge multiple objects into one target.
- `Objecter.toPlainObject(source, mapping?)`: Convert an instance to a plain JavaScript object.
- `Objecter.configure(options)`: Set global default options for all conversions.
- `Objecter.resetConfig()`: Reset global options to library defaults.
- `Objecter.registerProfile(profile)`: Register a reusable mapping profile.
- `Objecter.map(source, profileName, options?)`: Convert using a registered profile.
- `Objecter.clearProfiles()`: Clear all registered profiles.

### Mapping Options

Configuration object passed to methods as the last argument.

| Option                   | Type                  | Default | Description                                                              |
| :----------------------- | :-------------------- | :------ | :----------------------------------------------------------------------- |
| `throwOnValidationError` | `boolean`             | `true`  | Throw an error if validation fails.                                      |
| `throwOnMissingFields`   | `boolean`             | `true`  | Throw an error if a required field is missing in source.                 |
| `copyUndefined`          | `boolean`             | `false` | Whether to copy fields that are `undefined` in source.                   |
| `strictMapping`          | `boolean`             | `true`  | Throw an error if mapping targets a non-existent property.               |
| `autoMap`                | `boolean`             | `false` | Automatically copy properties with matching names not explicitly mapped. |
| `context`                | `Record<string, any>` | `{}`    | Additional context data accessible in transforms/validators.             |
| `validateSchema`         | `SchemaValidateFn`    | -       | Schema-level validation function executed after all field mappings.      |

### Built-in Validators

Accessible via `Validators` export:

- `required()`: Value must not be null or undefined.
- `pattern(regex, message?)`: Matches regex pattern.
- `oneOf(values)`: Value must be in the allowed list.
- `nonEmptyArray()`: Array must have at least one element.
- `custom(fn, message)`: Custom validation function.

### Built-in Transformers

Accessible via `Transformers` export:

- `trim()`: Trim whitespace from string.
- `toUpperCase()`, `toLowerCase()`: Change string case.
- `toNumber()`: Convert to number.
- `toBoolean()`: Convert to boolean.
- `toString()`: Convert to string.
- `toDate()`: Convert to Date object.
- `toISOString()`: Format Date/string/number to ISO string.
- `parseJSON()`: Parse JSON string.
- `toJSON()`: Stringify value to JSON.
- `round(decimals?)`: Round number.
- `clamp(min, max)`: Clamp number within range.
- `defaultTo(value)`: Use default if value is null/undefined.
- `mapValue(map, fallback?)`: Map value using a dictionary object.
- `pipe(...fns)`: Chain multiple transformers.
- `when(condition, transform)`: Apply transform only if condition is true.
- `pick(path)`: Extract nested value from object.
- `split(delimiter)`: Split string into array.
- `join(delimiter)`: Join array into string.

## Custom Validators and Transformers

Objecter dirancang untuk memberikan fleksibilitas maksimal kepada developer dalam membuat validator dan transformer sendiri. Daripada menyediakan ratusan built-in functions, library ini menyediakan interface yang simple untuk kamu build logic sesuai kebutuhan domain.

### Creating Custom Validators

Validator bisa berupa simple predicate function atau detailed validation function.

#### Simple Predicate Validator

```typescript
// Email validator
const isValidEmail = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

// Age range validator
const isAdult = (value: unknown): boolean => {
  return typeof value === 'number' && value >= 18 && value <= 120;
};

// String length validator
const minLength =
  (min: number) =>
  (value: unknown): boolean => {
    return typeof value === 'string' && value.length >= min;
  };

const mapping = [
  { from: 'email', to: 'email', validate: isValidEmail },
  { from: 'age', to: 'age', validate: isAdult },
  { from: 'username', to: 'username', validate: minLength(3) },
];
```

#### Detailed Validation Function

```typescript
import { type ValidateFn } from '@mevaspace/objecter';

// Validator dengan custom error message
const validatePassword: ValidateFn = (value, fieldName) => {
  if (typeof value !== 'string') {
    return { valid: false, errors: [`${fieldName} must be a string`] };
  }

  const errors: string[] = [];
  if (value.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(value)) errors.push('Password must contain uppercase letter');
  if (!/[0-9]/.test(value)) errors.push('Password must contain number');

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
};

const mapping = [{ from: 'password', to: 'password', validate: validatePassword }];
```

### Integrating with Zod

Objecter mendukung Zod schema secara native melalui `safeParse` interface.

```typescript
import { z } from 'zod';

// Direct Zod schema usage
const userSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18).max(120),
  username: z.string().min(3).max(20),
});

const mapping = [
  { from: 'email', to: 'email', validate: z.string().email() },
  { from: 'age', to: 'age', validate: z.number().min(18) },
  { from: 'username', to: 'username', validate: userSchema.shape.username },
];

// Helper untuk convert Zod schema ke ValidateFn
const zodValidator = <T>(schema: z.ZodSchema<T>): ValidateFn => {
  return (value, fieldName) => {
    const result = schema.safeParse(value);
    if (result.success) return { valid: true };

    const errors = result.error.errors.map((e) => e.message);
    return { valid: false, errors };
  };
};

// Usage
const mapping2 = [{ from: 'email', to: 'email', validate: zodValidator(z.string().email()) }];
```

### Composing Multiple Validators

```typescript
// Compose validators dengan AND logic
const composeValidators = (...validators: ValidateFn[]): ValidateFn => {
  return (value, fieldName, context) => {
    const allErrors: string[] = [];

    for (const validator of validators) {
      const result = validator(value, fieldName, context);
      if (!result.valid && result.errors) {
        allErrors.push(...result.errors);
      }
    }

    return allErrors.length > 0 ? { valid: false, errors: allErrors } : { valid: true };
  };
};

// Usage
const validateEmail: ValidateFn = (value) => {
  const valid = typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  return valid ? { valid: true } : { valid: false, errors: ['Invalid email format'] };
};

const validateNotDisposable: ValidateFn = (value) => {
  const disposableDomains = ['tempmail.com', 'throwaway.email'];
  const valid = typeof value === 'string' && !disposableDomains.some((d) => value.endsWith(d));
  return valid ? { valid: true } : { valid: false, errors: ['Disposable email not allowed'] };
};

const mapping = [{ from: 'email', to: 'email', validate: composeValidators(validateEmail, validateNotDisposable) }];
```

### Creating Custom Transformers

Transformer adalah function yang menerima value dan mengembalikan transformed value.

#### Simple Transformers

```typescript
import { type TransformFn } from '@mevaspace/objecter';

// Truncate string
const truncate = (maxLength: number): TransformFn => {
  return (value) => {
    if (typeof value !== 'string') return value;
    return value.length > maxLength ? value.slice(0, maxLength) + '...' : value;
  };
};

// Sanitize HTML
const sanitizeHtml: TransformFn = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/[<>]/g, '');
};

// Array filter
const filterArray = <T>(predicate: (item: T) => boolean): TransformFn => {
  return (value) => {
    if (!Array.isArray(value)) return value;
    return value.filter(predicate);
  };
};

// Array map
const mapArray = <T, R>(mapper: (item: T) => R): TransformFn => {
  return (value) => {
    if (!Array.isArray(value)) return value;
    return value.map(mapper);
  };
};

const mapping = [
  { from: 'bio', to: 'bio', transform: truncate(200) },
  { from: 'comment', to: 'comment', transform: sanitizeHtml },
  { from: 'tags', to: 'activeTags', transform: filterArray((tag: any) => tag.active) },
];
```

#### Context-Aware Transformers

```typescript
// Transformer yang mengakses source object
const fullName: TransformFn = (_, source: any) => {
  return `${source.firstName} ${source.lastName}`.trim();
};

// Transformer yang mengakses context
const formatCurrency: TransformFn = (value, _source, context) => {
  const locale = context.data?.locale || 'en-US';
  const currency = context.data?.currency || 'USD';

  if (typeof value !== 'number') return value;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
};

const mapping = [
  { from: 'firstName', to: 'fullName', transform: fullName },
  { from: 'price', to: 'formattedPrice', transform: formatCurrency },
];

const dto = Objecter.convert(source, TargetDTO, mapping, { context: { locale: 'id-ID', currency: 'IDR' } });
```

#### Composing Transformers

```typescript
// Pipe multiple transformers
const pipe = (...transformers: TransformFn[]): TransformFn => {
  return (value, source, context) => {
    return transformers.reduce((acc, transformer) => transformer(acc, source, context), value);
  };
};

// Usage
const mapping = [{ from: 'email', to: 'email', transform: pipe(Transformers.trim(), Transformers.toLowerCase()) }];
```

### Common Patterns

#### URL Validator

```typescript
const isValidUrl = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};
```

#### UUID Validator

```typescript
const isValidUUID = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};
```

#### Array Deduplication

```typescript
const unique = <T>(): TransformFn => {
  return (value) => {
    if (!Array.isArray(value)) return value;
    return [...new Set(value)];
  };
};
```

#### Object Field Picking

```typescript
const pick = <T extends Record<string, any>>(keys: string[]): TransformFn => {
  return (value) => {
    if (typeof value !== 'object' || value === null) return value;
    const result: any = {};
    for (const key of keys) {
      if (key in value) result[key] = value[key];
    }
    return result;
  };
};

const omit = <T extends Record<string, any>>(keys: string[]): TransformFn => {
  return (value) => {
    if (typeof value !== 'object' || value === null) return value;
    const result: any = { ...value };
    for (const key of keys) {
      delete result[key];
    }
    return result;
  };
};
```

### Best Practices

1. **Type Safety**: Selalu check type sebelum melakukan operasi

   ```typescript
   const safeTrim: TransformFn = (value) => {
     if (typeof value !== 'string') return value; // Guard clause
     return value.trim();
   };
   ```

2. **Reusability**: Buat factory functions untuk validators/transformers yang configurable

   ```typescript
   const range =
     (min: number, max: number) =>
     (value: unknown): boolean => {
       return typeof value === 'number' && value >= min && value <= max;
     };
   ```

3. **Error Messages**: Berikan error messages yang jelas dan actionable

   ```typescript
   const validateAge: ValidateFn = (value, fieldName) => {
     if (typeof value !== 'number') {
       return { valid: false, errors: [`${fieldName} must be a number`] };
     }
     if (value < 0 || value > 150) {
       return { valid: false, errors: [`${fieldName} must be between 0 and 150`] };
     }
     return { valid: true };
   };
   ```

4. **Immutability**: Jangan mutate input value, selalu return new value

   ```typescript
   // Bad
   const badTransform: TransformFn = (value: any) => {
     value.processed = true; // Mutation!
     return value;
   };

   // Good
   const goodTransform: TransformFn = (value: any) => {
     return { ...value, processed: true }; // New object
   };
   ```

## Limitations

1.  **Zero-Argument Constructor**: The target class **must** have a zero-argument constructor (or no constructor defined). Objecter instantiates the target using `new TargetClass()`.
2.  **Circular References**: Objecter does **not** currently handle circular references (e.g., Parent -> Child -> Parent). Attempting to map circular structures will result in a stack overflow.
3.  **Prototype Safety**: `autoMap` iterates over properties defined in the target instance and its prototype chain to determine what to copy. Ensure your target classes are simple DTOs.
