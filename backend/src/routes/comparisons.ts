import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

// Helper function to fetch image and convert to base64
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  return base64;
}

export function registerComparisonsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/upload/image
  app.fastify.post(
    '/api/upload/image',
    async (request, reply) => {
      app.logger.info({}, 'Starting image upload');

      try {
        const data = await request.file({ limits: { fileSize: 10 * 1024 * 1024 } });
        if (!data) {
          app.logger.warn({}, 'No file provided in upload request');
          return reply.status(400).send({ error: 'No file provided' });
        }

        let buffer: Buffer;
        try {
          buffer = await data.toBuffer();
        } catch (err) {
          app.logger.warn({ err }, 'File size exceeded limit');
          return reply.status(413).send({ error: 'File too large' });
        }

        const filename = `${Date.now()}-${data.filename}`;
        const key = `uploads/comparisons/${filename}`;

        const uploadedKey = await app.storage.upload(key, buffer);
        const { url } = await app.storage.getSignedUrl(uploadedKey);

        app.logger.info({ filename, key: uploadedKey }, 'Image uploaded successfully');
        return { url, filename };
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to upload image');
        throw error;
      }
    }
  );

  // POST /api/compare
  app.fastify.post(
    '/api/compare',
    async (request, reply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const body = request.body as {
        mainImageUrl: string;
        mainImageLabel?: string;
        compareImage1Url: string;
        compareImage1Label?: string;
        compareImage2Url: string;
        compareImage2Label?: string;
      };

      const {
        mainImageUrl,
        mainImageLabel,
        compareImage1Url,
        compareImage1Label,
        compareImage2Url,
        compareImage2Label,
      } = body;

      app.logger.info(
        {
          userId,
          mainImageLabel,
          compareImage1Label,
          compareImage2Label,
        },
        'Starting facial similarity comparison'
      );

      try {
        // Fetch and convert all images to base64
        app.logger.info({ mainImageLabel }, 'Fetching main image');
        const mainImageBase64 = await fetchImageAsBase64(mainImageUrl);

        app.logger.info({ compareImage1Label }, 'Fetching comparison image 1');
        const compareImage1Base64 = await fetchImageAsBase64(compareImage1Url);

        app.logger.info({ compareImage2Label }, 'Fetching comparison image 2');
        const compareImage2Base64 = await fetchImageAsBase64(compareImage2Url);

        app.logger.info({}, 'Images fetched successfully, starting analysis');

        // Use Gemini for vision analysis
        const comparisonSchema = z.object({
          winner: z.number().int().min(1).max(2),
          reasons: z.array(
            z.object({
              feature: z.string(),
              description: z.string(),
              similarity: z.number().min(0).max(100),
            })
          ),
          summary: z.string(),
        });

        const { object: analysisData } = await generateObject({
          model: gateway('google/gemini-3-flash'),
          schema: comparisonSchema,
          schemaName: 'FacialSimilarityAnalysis',
          schemaDescription:
            'Analysis of facial feature similarities between images',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are an expert facial analysis AI. Analyze the following three images:
1. MAIN IMAGE (the reference face): ${mainImageLabel || 'Reference image'}
2. COMPARISON IMAGE 1: ${compareImage1Label || 'First comparison'}
3. COMPARISON IMAGE 2: ${compareImage2Label || 'Second comparison'}

Compare the facial features in both comparison images against the main image. Analyze these specific features:
- Eye distance and spacing
- Face shape (oval, round, square, rectangular, etc.)
- Nose shape and size
- Mouth shape and lips
- Eyebrow shape and thickness
- Facial proportions (distance between features)
- Skin tone similarity
- Overall facial symmetry

Determine which comparison image (1 or 2) has facial features that are more similar to the main image.

Return your analysis as JSON with:
- winner: 1 or 2 (which image is more similar)
- reasons: array of 5-7 specific feature comparisons with similarity scores (0-100)
- summary: 2-3 sentence summary of why one image is more similar

Format your response as valid JSON only, no additional text.`,
                },
                {
                  type: 'image',
                  image: mainImageBase64,
                },
                {
                  type: 'image',
                  image: compareImage1Base64,
                },
                {
                  type: 'image',
                  image: compareImage2Base64,
                },
              ],
            },
          ],
        });

        app.logger.info(
          {
            winner: analysisData.winner,
            reasonsCount: analysisData.reasons.length,
          },
          'Facial analysis completed'
        );

        // Save comparison to database
        const [comparison] = await app.db
          .insert(schema.comparisons)
          .values({
            userId,
            mainImageUrl,
            mainImageLabel,
            compareImage1Url,
            compareImage1Label,
            compareImage2Url,
            compareImage2Label,
            winnerImage: analysisData.winner,
            analysisResult: {
              reasons: analysisData.reasons,
              summary: analysisData.summary,
            },
          })
          .returning();

        app.logger.info(
          { comparisonId: comparison.id, userId },
          'Comparison saved to database'
        );

        const winnerLabel =
          analysisData.winner === 1
            ? compareImage1Label
            : compareImage2Label;

        return {
          comparisonId: comparison.id,
          winner: analysisData.winner as 1 | 2,
          winnerLabel,
          reasons: analysisData.reasons,
          summary: analysisData.summary,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to analyze facial similarity'
        );
        throw error;
      }
    }
  );

  // GET /api/comparisons
  app.fastify.get(
    '/api/comparisons',
    async (request, reply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Fetching user comparison history');

      try {
        const userComparisons = await app.db
          .select({
            id: schema.comparisons.id,
            mainImageUrl: schema.comparisons.mainImageUrl,
            mainImageLabel: schema.comparisons.mainImageLabel,
            compareImage1Url: schema.comparisons.compareImage1Url,
            compareImage1Label: schema.comparisons.compareImage1Label,
            compareImage2Url: schema.comparisons.compareImage2Url,
            compareImage2Label: schema.comparisons.compareImage2Label,
            winner: schema.comparisons.winnerImage,
            createdAt: schema.comparisons.createdAt,
          })
          .from(schema.comparisons)
          .where(eq(schema.comparisons.userId, userId));

        app.logger.info(
          { userId, count: userComparisons.length },
          'Comparison history retrieved'
        );

        return userComparisons.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        }));
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch comparisons');
        throw error;
      }
    }
  );

  // GET /api/comparisons/:id
  app.fastify.get(
    '/api/comparisons/:id',
    async (request, reply) => {
      const params = request.params as { id: string };
      const { id } = params;
      app.logger.info({ comparisonId: id }, 'Fetching comparison details');

      try {
        const comparison = await app.db.query.comparisons.findFirst({
          where: eq(schema.comparisons.id, id),
        });

        if (!comparison) {
          app.logger.warn({ comparisonId: id }, 'Comparison not found');
          return reply.status(404).send({ error: 'Comparison not found' });
        }

        app.logger.info(
          { comparisonId: id, userId: comparison.userId },
          'Comparison details retrieved'
        );

        const winnerLabel =
          comparison.winnerImage === 1
            ? comparison.compareImage1Label
            : comparison.compareImage2Label;

        const analysisResult = comparison.analysisResult as {
          reasons: Array<{
            feature: string;
            description: string;
            similarity: number;
          }>;
          summary: string;
        } | null;

        return {
          id: comparison.id,
          mainImageUrl: comparison.mainImageUrl,
          mainImageLabel: comparison.mainImageLabel,
          compareImage1Url: comparison.compareImage1Url,
          compareImage1Label: comparison.compareImage1Label,
          compareImage2Url: comparison.compareImage2Url,
          compareImage2Label: comparison.compareImage2Label,
          winner: comparison.winnerImage,
          winnerLabel,
          reasons: analysisResult?.reasons || [],
          summary: analysisResult?.summary || '',
          createdAt: comparison.createdAt.toISOString(),
        };
      } catch (error) {
        app.logger.error({ err: error, comparisonId: id }, 'Failed to fetch comparison');
        throw error;
      }
    }
  );
}
