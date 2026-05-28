/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Define the 'users' table using the Firebase Auth UID as the string identifier.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'entries' table (representing user chat items or data) with a foreign key to 'users'.
export const entries = pgTable('entries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  content: text('content').notNull(),
  date: text('date').notNull(), // Format: YYYY-MM-DD
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relationships for the 'users' table.
export const usersRelations = relations(users, ({ many }) => ({
  entries: many(entries),
}));

// Define relationships for the 'entries' table.
export const entriesRelations = relations(entries, ({ one }) => ({
  author: one(users, {
    fields: [entries.userId],
    references: [users.id],
  }),
}));
