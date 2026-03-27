/**
 * GlucoLens — Drizzle Schema Additions
 *
 * These table definitions need to be ADDED to the existing
 * drizzle/schema.ts file alongside the existing tables.
 *
 * Also add these new columns to the existing `userProfiles` table:
 *   activityLevel  (already in Bug 4 fix — ensure it's there)
 *   onboardingComplete  TINYINT NOT NULL DEFAULT 0
 *
 * IMPORTANT: After merging these into schema.ts, generate and run
 * the Drizzle migration:
 *   npx drizzle-kit generate:mysql
 *   npx drizzle-kit push:mysql  (dev only)
 */

import {
  mysqlTable,
  bigint,
  varchar,
  text,
  decimal,
  mysqlEnum,
  boolean,
  timestamp,
  tinyint,
  index,
} from "drizzle-orm/mysql-core";
import { userProfiles } from "./schema"; // existing table

// ── Glucose Logs ──────────────────────────────────────────────────────────────
export const glucoseLogs = mysqlTable("glucoseLogs", {
  id:          bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  userId:      varchar("userId", { length: 128 }).notNull(),
  valueMmol:   decimal("valueMmol", { precision: 4, scale: 1 }).notNull(),
  readingType: mysqlEnum("readingType", ["fasting", "pre-meal", "post-meal", "bedtime", "random"])
               .notNull().default("random"),
  notes:       text("notes"),
  recordedAt:  timestamp("recordedAt").notNull().defaultNow(),
}, (t) => ({
  userIdx: index("glucoseLogs_userId_recordedAt").on(t.userId, t.recordedAt),
}));

// ── Weight Logs ───────────────────────────────────────────────────────────────
export const weightLogs = mysqlTable("weightLogs", {
  id:         bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  userId:     varchar("userId", { length: 128 }).notNull(),
  weightKg:   decimal("weightKg", { precision: 5, scale: 1 }).notNull(),
  notes:      text("notes"),
  recordedAt: timestamp("recordedAt").notNull().defaultNow(),
}, (t) => ({
  userIdx: index("weightLogs_userId_recordedAt").on(t.userId, t.recordedAt),
}));

// ── Reminders ─────────────────────────────────────────────────────────────────
export const reminders = mysqlTable("reminders", {
  id:        bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  userId:    varchar("userId", { length: 128 }).notNull(),
  type:      mysqlEnum("type", ["meal", "water"]).notNull(),
  label:     varchar("label", { length: 100 }).notNull(),
  time:      varchar("time", { length: 5 }).notNull(),     // HH:MM
  enabled:   boolean("enabled").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// ── Meal Favourites ───────────────────────────────────────────────────────────
export const mealFavourites = mysqlTable("mealFavourites", {
  id:           bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  userId:       varchar("userId", { length: 128 }).notNull(),
  mealName:     varchar("mealName", { length: 255 }).notNull(),
  calories:     decimal("calories", { precision: 7, scale: 1 }),
  totalCarbs:   decimal("totalCarbs", { precision: 6, scale: 1 }),
  totalSugar:   decimal("totalSugar", { precision: 6, scale: 1 }),
  snapshotJson: text("snapshotJson"),   // full analysis JSON for quick re-log
  createdAt:    timestamp("createdAt").notNull().defaultNow(),
});

// ── MySQL migration SQL ───────────────────────────────────────────────────────
// If you prefer raw SQL over drizzle-kit, run this in your MySQL console:
/*

ALTER TABLE `userProfiles`
  ADD COLUMN `onboardingComplete` TINYINT NOT NULL DEFAULT 0 AFTER `activityLevel`;

CREATE TABLE `glucoseLogs` (
  `id`          BIGINT AUTO_INCREMENT PRIMARY KEY,
  `userId`      VARCHAR(128) NOT NULL,
  `valueMmol`   DECIMAL(4,1) NOT NULL,
  `readingType` ENUM('fasting','pre-meal','post-meal','bedtime','random') NOT NULL DEFAULT 'random',
  `notes`       TEXT,
  `recordedAt`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `glucoseLogs_userId_recordedAt` (`userId`, `recordedAt`)
);

CREATE TABLE `weightLogs` (
  `id`         BIGINT AUTO_INCREMENT PRIMARY KEY,
  `userId`     VARCHAR(128) NOT NULL,
  `weightKg`   DECIMAL(5,1) NOT NULL,
  `notes`      TEXT,
  `recordedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `weightLogs_userId_recordedAt` (`userId`, `recordedAt`)
);

CREATE TABLE `reminders` (
  `id`        BIGINT AUTO_INCREMENT PRIMARY KEY,
  `userId`    VARCHAR(128) NOT NULL,
  `type`      ENUM('meal','water') NOT NULL,
  `label`     VARCHAR(100) NOT NULL,
  `time`      VARCHAR(5) NOT NULL,
  `enabled`   BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `mealFavourites` (
  `id`           BIGINT AUTO_INCREMENT PRIMARY KEY,
  `userId`       VARCHAR(128) NOT NULL,
  `mealName`     VARCHAR(255) NOT NULL,
  `calories`     DECIMAL(7,1),
  `totalCarbs`   DECIMAL(6,1),
  `totalSugar`   DECIMAL(6,1),
  `snapshotJson` TEXT,
  `createdAt`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

*/
