import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const comparisons = pgTable('comparisons', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  mainImageUrl: text('main_image_url').notNull(),
  mainImageLabel: text('main_image_label'),
  compareImage1Url: text('compare_image_1_url').notNull(),
  compareImage1Label: text('compare_image_1_label'),
  compareImage2Url: text('compare_image_2_url').notNull(),
  compareImage2Label: text('compare_image_2_label'),
  winnerImage: integer('winner_image'), // 1 or 2
  analysisResult: jsonb('analysis_result').$type<{
    reasons: Array<{
      feature: string;
      description: string;
      similarity: number;
    }>;
    summary: string;
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
