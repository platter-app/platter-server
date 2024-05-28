import { supabase } from '@/libs/supabase/client';
import { zValidator } from '@/middlewares/zodValidator.middleware';

import { db } from '@/libs/database/db';
import { users, apiKeys } from '@/libs/database/schema';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { endTime, startTime } from 'hono/timing';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import authMiddleware from '@/middlewares/auth.middleware';
const registerRoutes = new Hono<{
  Variables: {
    user: {
      id: string;
      email: string;
      created_at: string;
      updated_at: string;
    };
  };
}>()
  .use('*', authMiddleware)
  .post(
    '/cefi',
    zValidator(
      'json',
      z.object({
        provider: z.string(),
        apiKey: z.string(),
        apiSecret: z.string(),
        passPhrase: z.string().optional(),
      })
    ),
    async (c) => {
      const user = c.get('user');

      console.log(user.id, user.email, user.created_at, user.updated_at);

      const storedApiKeys = await db.select().from(apiKeys).where(eq(apiKeys.ownerId, user.id));
      // console.log(storedApiKeys);
      const { provider, apiKey, apiSecret, passPhrase } = c.req.valid('json');

      const isRegistered = storedApiKeys.some((item) => item.provider === provider);
      if (isRegistered) {
        throw new HTTPException(409, {
          message: `Provider ${provider} Data already exists`,
        });
      }

      const dbCefiRegistration = {
        ownerId: user.id,
        provider,
        apiKey,
        apiSecret,
        passPhrase,
      };
      // console.log(dbCefiRegistration);
      const apiKeyRegistration = await db.insert(apiKeys).values(dbCefiRegistration).returning();

      // console.log(apiKeyRegistration);

      return c.json({
        message: 'Registered successfully',
      });
    }
  );

export default registerRoutes;
