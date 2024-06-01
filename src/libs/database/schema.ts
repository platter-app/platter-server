import { sql } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(),
  email: text('email'),
  createdAt: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export const cefiRegistration = pgTable('cefi_registration', {
  id: serial('id').primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  provider: text('provider').notNull(),
  apiKey: text('api_key').notNull(),
  apiSecret: text('api_secret').notNull(),
  passPhrase: text('pass_phrase'),
  createdAt: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export const defiRegistration = pgTable('defi_registration', {
  id: serial('id').primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  addressType: text('address_type').notNull(),
  address: text('address').notNull(),
  alias: text('alias'),
  createdAt: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});
