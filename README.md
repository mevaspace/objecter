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

Use built-in validators and transformers to sanitize and check data during conversion.

```typescript
import { Objecter, Validators, Transformers } from '@mevaspace/objecter';

const mapping = [
  {
    from: 'email',
    to: 'email',
    // Trim whitespace first, then validate it's an email pattern
    transform: Transformers.trim(),
    validate: Validators.pattern(/^.+@.+\..+$/),
  },
  {
    from: 'age',
    to: 'age',
    // Convert string input to number, then validate logic
    transform: Transformers.toNumber(),
    validate: Validators.custom((age: number) => age >= 18 && age <= 100, 'Must be between 18 and 100'),
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

### 6. Merging Objects

Merge multiple source objects into a single target instance. Later sources override earlier ones.

```typescript
const mergedDto = Objecter.merge([source1, source2], TargetDTO, mapping);
```

### 7. Plain Objects

Convert class instances to plain JavaScript objects (stripping prototypes), or simply pick/transform fields from an object.

```typescript
const plainObj = Objecter.toPlainObject(userEntity, mapping);
```

## API Overview

### Core Methods

- `Objecter.convert(source, TargetClass, mapping, options?)`: Convert a single object.
- `Objecter.convertArray(sourceArray, TargetClass, mapping, options?)`: Convert an array of objects.
- `Objecter.convertArrayGenerator(sourceArray, TargetClass, mapping, options?)`: Generator for processing large arrays lazyily.
- `Objecter.createMapper(TargetClass, mapping, options?)`: Create a reusable mapping function.
- `Objecter.createArrayMapper(TargetClass, mapping, options?)`: Create a reusable array mapping function.
- `Objecter.merge(sources, TargetClass, mapping, options?)`: Merge multiple objects into one target.
- `Objecter.toPlainObject(source, mapping?)`: Convert an instance to a plain JavaScript object.

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

## Limitations

1.  **Zero-Argument Constructor**: The target class **must** have a zero-argument constructor (or no constructor defined). Objecter instantiates the target using `new TargetClass()`.
2.  **Circular References**: Objecter does **not** currently handle circular references (e.g., Parent -> Child -> Parent). Attempting to map circular structures will result in a stack overflow.
3.  **Prototype Safety**: `autoMap` iterates over properties defined in the target instance and its prototype chain to determine what to copy. Ensure your target classes are simple DTOs.
