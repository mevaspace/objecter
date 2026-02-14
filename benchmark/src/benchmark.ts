import 'reflect-metadata';

import { bench, group, run, summary } from 'mitata';
import { Objecter, FieldMapping } from '@mevaspace/objecter';
import { plainToInstance } from 'class-transformer';
import { createMapper, createMap, forMember, mapFrom, Mapper } from '@automapper/core';
import { classes } from '@automapper/classes';

import {
  UserSource,
  ObjUserDTO,
  ObjAddressDTO,
  ObjCompanyDTO,
  CTUserDTO,
  AMUserSource,
  AMUserDTO,
  AMAddressSource,
  AMAddressDTO,
  AMCompanySource,
  AMCompanyDTO,
  generateUsers,
} from './fixtures';

// ─── Objecter Setup ────────────────────────────────────────

const addressMapping: FieldMapping[] = [{ from: 'city' }, { from: 'zip' }];

const addressMapper = Objecter.createMapper<unknown, ObjAddressDTO>(ObjAddressDTO, addressMapping, {
  strictMapping: false,
});

const companyMapping: FieldMapping[] = [
  { from: 'name' },
  { from: 'industry' },
  { from: 'address', transform: (v: unknown) => addressMapper(v as Record<string, unknown>) },
];

const companyMapper = Objecter.createMapper<unknown, ObjCompanyDTO>(ObjCompanyDTO, companyMapping, {
  strictMapping: false,
});

const userMapping: FieldMapping[] = [
  { from: 'id' },
  {
    from: 'firstName',
    to: 'fullName',
    transform: (_v: unknown, src: unknown) => {
      const s = src as UserSource;
      return `${s.firstName} ${s.lastName}`;
    },
  },
  { from: 'age' },
  { from: 'email' },
  { from: 'phone' },
  { from: 'address', transform: (v: unknown) => addressMapper(v as Record<string, unknown>) },
  { from: 'billingAddress', transform: (v: unknown) => addressMapper(v as Record<string, unknown>) },
  { from: 'company', transform: (v: unknown) => companyMapper(v as Record<string, unknown>) },
];

const objecterMapper = Objecter.createMapper<UserSource, ObjUserDTO>(ObjUserDTO, userMapping, { strictMapping: false });

// ─── AutoMapper Setup ──────────────────────────────────────

const amMapper: Mapper = createMapper({ strategyInitializer: classes() });

createMap(
  amMapper,
  AMAddressSource,
  AMAddressDTO,
  forMember(
    (d) => d.city,
    mapFrom((s) => s.city),
  ),
  forMember(
    (d) => d.zip,
    mapFrom((s) => s.zip),
  ),
);

createMap(
  amMapper,
  AMCompanySource,
  AMCompanyDTO,
  forMember(
    (d) => d.name,
    mapFrom((s) => s.name),
  ),
  forMember(
    (d) => d.industry,
    mapFrom((s) => s.industry),
  ),
  forMember(
    (d) => d.address,
    mapFrom((s) => amMapper.map(s.address, AMAddressSource, AMAddressDTO)),
  ),
);

createMap(
  amMapper,
  AMUserSource,
  AMUserDTO,
  forMember(
    (d) => d.id,
    mapFrom((s) => s.id),
  ),
  forMember(
    (d) => d.fullName,
    mapFrom((s) => `${s.firstName} ${s.lastName}`),
  ),
  forMember(
    (d) => d.age,
    mapFrom((s) => s.age),
  ),
  forMember(
    (d) => d.email,
    mapFrom((s) => s.email),
  ),
  forMember(
    (d) => d.phone,
    mapFrom((s) => s.phone),
  ),
  forMember(
    (d) => d.address,
    mapFrom((s) => amMapper.map(s.address, AMAddressSource, AMAddressDTO)),
  ),
  forMember(
    (d) => d.billingAddress,
    mapFrom((s) => amMapper.map(s.billingAddress, AMAddressSource, AMAddressDTO)),
  ),
  forMember(
    (d) => d.company,
    mapFrom((s) => amMapper.map(s.company, AMCompanySource, AMCompanyDTO)),
  ),
);

// ─── Helpers ───────────────────────────────────────────────

function ctTransform(source: UserSource): CTUserDTO {
  return plainToInstance(
    CTUserDTO,
    {
      id: source.id,
      fullName: `${source.firstName} ${source.lastName}`,
      age: source.age,
      email: source.email,
      phone: source.phone,
      address: { city: source.address.city, zip: source.address.zip },
      billingAddress: { city: source.billingAddress.city, zip: source.billingAddress.zip },
      company: {
        name: source.company.name,
        industry: source.company.industry,
        address: { city: source.company.address.city, zip: source.company.address.zip },
      },
    },
    { excludeExtraneousValues: true },
  );
}

function amTransform(source: UserSource): AMUserDTO {
  const amSource = Object.assign(new AMUserSource(), {
    ...source,
    address: Object.assign(new AMAddressSource(), source.address),
    billingAddress: Object.assign(new AMAddressSource(), source.billingAddress),
    company: Object.assign(new AMCompanySource(), {
      ...source.company,
      address: Object.assign(new AMAddressSource(), source.company.address),
    }),
  });
  return amMapper.map(amSource, AMUserSource, AMUserDTO);
}

// ─── Prepare Data ──────────────────────────────────────────

const users1 = generateUsers(1);
const users1K = generateUsers(1_000);
const users10K = generateUsers(10_000);
const users100K = generateUsers(100_000);
const users1M = generateUsers(1_000_000);

// ─── Benchmarks ────────────────────────────────────────────

summary(() => {
  group('Single Object', () => {
    bench('Objecter', function* (arg) {
      yield () => objecterMapper(arg.get('source'));
    })
      .args('source', users1)
      .gc('inner');

    bench('class-transformer', function* (arg) {
      yield () => ctTransform(arg.get('source'));
    })
      .args('source', users1)
      .gc('inner');

    bench('AutoMapper', function* (arg) {
      yield () => amTransform(arg.get('source'));
    })
      .args('source', users1)
      .gc('inner');
  });

  group('1K Object', () => {
    bench('Objecter', function () {
      const arg = users1K;
      for (const x of arg) objecterMapper(x);
    }).gc('inner');

    bench('class-transformer', function () {
      const arg = users1K;
      for (const x of arg) ctTransform(x);
    }).gc('inner');

    bench('AutoMapper', function () {
      const arg = users1K;
      for (const x of arg) amTransform(x);
    }).gc('inner');
  });

  group('10K Object', () => {
    bench('Objecter', function () {
      const arg = users10K;
      for (const x of arg) objecterMapper(x);
    }).gc('inner');

    bench('class-transformer', function () {
      const arg = users10K;
      for (const x of arg) ctTransform(x);
    }).gc('inner');

    bench('AutoMapper', function () {
      const arg = users10K;
      for (const x of arg) amTransform(x);
    }).gc('inner');
  });

  group('100K Object', () => {
    bench('Objecter', function () {
      const arg = users100K;
      for (const x of arg) objecterMapper(x);
    }).gc('inner');

    bench('class-transformer', function () {
      const arg = users100K;
      for (const x of arg) ctTransform(x);
    }).gc('inner');

    bench('AutoMapper', function () {
      const arg = users100K;
      for (const x of arg) amTransform(x);
    }).gc('inner');
  });

  group('1M Object', () => {
    bench('Objecter', function () {
      const arg = users1M;
      for (const x of arg) objecterMapper(x);
    }).gc('inner');

    bench('class-transformer', function () {
      const arg = users1M;
      for (const x of arg) ctTransform(x);
    }).gc('inner');

    bench('AutoMapper', function () {
      const arg = users1M;
      for (const x of arg) amTransform(x);
    }).gc('inner');
  });
});

void run({ format: { mitata: { name: 'longest' } } });
