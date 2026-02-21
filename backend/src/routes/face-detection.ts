import type { FastifyRequest, FastifyReply } from 'fastify';
import { gateway } from '@specific-dev/framework';
import { generateObject } from 'ai';
import { z } from 'zod';
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

export function registerFaceDetectionRoutes(app: App) {
  // POST /api/detect-faces
  app.fastify.post(
    '/api/detect-faces',
    async (request, reply) => {
      const body = request.body as {
        imageUrl?: string;
      };

      const { imageUrl } = body;

      if (!imageUrl) {
        app.logger.warn({}, 'Face detection request without imageUrl');
        return reply.status(400).send({ error: 'imageUrl is required' });
      }

      app.logger.info({ imageUrl }, 'Starting face detection');

      try {
        // Fetch and convert image to base64
        app.logger.info({}, 'Fetching image for face detection');
        const imageBase64 = await fetchImageAsBase64(imageUrl);

        app.logger.info({}, 'Image fetched, analyzing with Gemini');

        // Use Gemini for face detection
        const faceDetectionSchema = z.object({
          faceCount: z.number().int().min(0),
          faces: z.array(
            z.object({
              x: z.number().min(0).max(100),
              y: z.number().min(0).max(100),
              width: z.number().min(0).max(100),
              height: z.number().min(0).max(100),
            })
          ),
          confidence: z.number().min(0).max(100),
        });

        const { object: detectionData } = await generateObject({
          model: gateway('google/gemini-3-flash'),
          schema: faceDetectionSchema,
          schemaName: 'FaceDetectionAnalysis',
          schemaDescription:
            'Analysis of faces detected in an image with bounding box coordinates',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this image and detect all human faces.

For each face detected, provide:
1. The bounding box coordinates as percentages of the image dimensions (0-100):
   - x: horizontal position (left edge as percentage)
   - y: vertical position (top edge as percentage)
   - width: face width as percentage of image width
   - height: face height as percentage of image height

Return the analysis as JSON with:
- faceCount: number of faces detected (0 or more)
- faces: array of face objects with x, y, width, height coordinates (as percentages)
- confidence: overall confidence in the detection (0-100)

If no faces are detected, return faceCount: 0 and an empty faces array.

Be precise with the bounding boxes - they should tightly encompass each face.
Use percentages (0-100) for all coordinates, not pixels.

Format your response as valid JSON only, no additional text.`,
                },
                {
                  type: 'image',
                  image: imageBase64,
                },
              ],
            },
          ],
        });

        app.logger.info(
          {
            faceCount: detectionData.faceCount,
            confidence: detectionData.confidence,
          },
          'Face detection completed'
        );

        return {
          faceCount: detectionData.faceCount,
          faces: detectionData.faces,
          confidence: detectionData.confidence,
        };
      } catch (error) {
        app.logger.error(
          { err: error, imageUrl },
          'Failed to detect faces'
        );
        throw error;
      }
    }
  );
}
