import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import sharp from 'sharp';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

// Helper function to fetch, compress, and convert image to base64
async function fetchImageAsBase64(imageUrl: string, app: any): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);

    app.logger.info(
      { originalSize: imageBuffer.length },
      'Image fetched, starting compression'
    );

    // Compress and resize image using sharp
    // Resize to max 512px width, 60% quality JPEG to reduce payload
    const compressedBuffer = await sharp(imageBuffer)
      .resize(512, 512, {
        fit: 'inside', // Keep aspect ratio, fit inside 512x512
        withoutEnlargement: true, // Don't upscale small images
      })
      .jpeg({ quality: 60, progressive: true }) // 60% quality JPEG for smaller size
      .toBuffer();

    const base64 = compressedBuffer.toString('base64');

    app.logger.info(
      {
        originalSize: imageBuffer.length,
        compressedSize: compressedBuffer.length,
        reduction: Math.round((1 - compressedBuffer.length / imageBuffer.length) * 100),
      },
      'Image compressed successfully'
    );

    return base64;
  } catch (error) {
    throw new Error(`Failed to process image from ${imageUrl}: ${error instanceof Error ? error.message : String(error)}`);
  }
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
        const mainImageBase64 = await fetchImageAsBase64(mainImageUrl, app);

        app.logger.info({ compareImage1Label }, 'Fetching comparison image 1');
        const compareImage1Base64 = await fetchImageAsBase64(compareImage1Url, app);

        app.logger.info({ compareImage2Label }, 'Fetching comparison image 2');
        const compareImage2Base64 = await fetchImageAsBase64(compareImage2Url, app);

        app.logger.info({}, 'Images fetched successfully, starting analysis');

        // Use Gemini for vision analysis
        const comparisonSchema = z.object({
          winner: z.number().int().min(1).max(2),
          winnerSimilarity: z.number().int().min(0).max(100),
          loserSimilarity: z.number().int().min(0).max(100),
          reasons: z.array(
            z.object({
              feature: z.string(),
              description: z.string(),
              winnerValue: z.number().int().min(0).max(100),
              loserValue: z.number().int().min(0).max(100),
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
                  text: `Sei un esperto di analisi facciale AI. Analizza le seguenti tre immagini:
1. IMMAGINE PRINCIPALE (il viso di riferimento): ${mainImageLabel || 'Immagine di riferimento'}
2. IMMAGINE DI CONFRONTO 1: ${compareImage1Label || 'Primo confronto'}
3. IMMAGINE DI CONFRONTO 2: ${compareImage2Label || 'Secondo confronto'}

COMPITO: Confronta ENTRAMBE le immagini di confronto (1 e 2) rispetto all'immagine principale. Per ogni caratteristica, fornisci:
- Una percentuale di somiglianza per l'immagine 1 (0-100)
- Una percentuale di somiglianza per l'immagine 2 (0-100)
- Una descrizione che spiega il confronto tra entrambe le immagini

Analizza questi tratti specifici:
- Distanza tra gli occhi e spaziatura
- Forma del viso (ovale, rotonda, quadrata, rettangolare, ecc.)
- Forma e dimensione del naso
- Forma della bocca e delle labbra
- Forma e spessore delle sopracciglia
- Proporzioni facciali (distanza tra i tratti)
- Somiglianza del tono della pelle
- Simmetria generale del viso

Determina quale immagine (1 o 2) ha la somiglianza complessiva più alta con l'immagine principale.

Restituisci la tua analisi come JSON con:
- winner: 1 o 2 (quale immagine è più simile complessivamente)
- winnerSimilarity: percentuale media di somiglianza del vincitore con l'immagine principale (0-100)
- loserSimilarity: percentuale media di somiglianza del perdente con l'immagine principale (0-100)
- reasons: array di 5-8 confronti specifici dei tratti, OGNUNO con:
  - feature: nome della caratteristica (es. "Forma del viso", "Distanza tra gli occhi")
  - description: descrizione in italiano che confronta ENTRAMBE le foto per questa caratteristica, spiegando quale è più simile alla foto principale e perché
  - winnerValue: percentuale di somiglianza del vincitore per questo tratto (0-100)
  - loserValue: percentuale di somiglianza del perdente per questo tratto (0-100)
- summary: riepilogo in italiano di 2-3 frasi che menziona i nomi delle due immagini, le loro percentuali di somiglianza e spiega perché una assomiglia più dell'altra

IMPORTANTE:
- Tutte le descrizioni e il riepilogo DEVONO essere scritti in italiano. Non usare alcun testo in inglese.
- Ogni descrizione deve confrontare ENTRAMBE le immagini in gara.
- Le percentuali devono essere realistiche e coerenti tra i tratti.
- Il winner deve avere una winnerSimilarity più alta di loserSimilarity.

Formatta la risposta come JSON valido solamente, nessun testo aggiuntivo.`,
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
            userId: userId,
            mainImageUrl,
            mainImageLabel,
            compareImage1Url,
            compareImage1Label,
            compareImage2Url,
            compareImage2Label,
            winnerImage: analysisData.winner,
            analysisResult: {
              winnerSimilarity: analysisData.winnerSimilarity,
              loserSimilarity: analysisData.loserSimilarity,
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

        const comparisonDifference =
          analysisData.winnerSimilarity - analysisData.loserSimilarity;

        return {
          comparisonId: comparison.id,
          winner: analysisData.winner as 1 | 2,
          winnerLabel,
          winnerSimilarity: analysisData.winnerSimilarity,
          loserSimilarity: analysisData.loserSimilarity,
          comparisonDifference,
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
          winnerSimilarity: number;
          loserSimilarity: number;
          reasons: Array<{
            feature: string;
            description: string;
            winnerValue: number;
            loserValue: number;
          }>;
          summary: string;
        } | null;

        const comparisonDifference =
          (analysisResult?.winnerSimilarity || 0) - (analysisResult?.loserSimilarity || 0);

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
          winnerSimilarity: analysisResult?.winnerSimilarity || 0,
          loserSimilarity: analysisResult?.loserSimilarity || 0,
          comparisonDifference,
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

  // DELETE /api/comparisons/:id
  app.fastify.delete(
    '/api/comparisons/:id',
    async (request, reply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const params = request.params as { id: string };
      const { id } = params;

      app.logger.info({ comparisonId: id, userId }, 'Delete comparison requested');

      try {
        // Find the comparison to verify it belongs to the user
        const comparison = await app.db.query.comparisons.findFirst({
          where: eq(schema.comparisons.id, id),
        });

        if (!comparison) {
          app.logger.warn({ comparisonId: id }, 'Comparison not found');
          return reply.status(404).send({ error: 'Comparison not found' });
        }

        // Check if the comparison belongs to the authenticated user
        if (comparison.userId !== userId) {
          app.logger.warn(
            { comparisonId: id, userId, ownerId: comparison.userId },
            'User attempted to delete someone else\'s comparison'
          );
          return reply.status(403).send({ error: 'Unauthorized to delete this comparison' });
        }

        // Delete the comparison
        await app.db.delete(schema.comparisons).where(eq(schema.comparisons.id, id));

        app.logger.info(
          { comparisonId: id, userId },
          'Comparison deleted successfully'
        );

        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, comparisonId: id, userId },
          'Failed to delete comparison'
        );
        throw error;
      }
    }
  );
}
