import { supabase } from '@/libs/supabase/client';
import { zValidator } from '@/middlewares/zodValidator.middleware';

import { db } from '@/libs/database/db';
import { users, cefiRegistration, defiRegistration } from '@/libs/database/schema';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { endTime, startTime } from 'hono/timing';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import authMiddleware from '@/middlewares/auth.middleware';
import cefiFetcher from '@/services/fetchers/cefi/index';
import defiFetcher from '@/services/fetchers/defi/index';
const portfolioRoutes = new Hono<{
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

  .get('/cefi', async (c) => {
    const user = c.get('user');

    const storedApiKeys = await db.select().from(cefiRegistration).where(eq(cefiRegistration.ownerId, user.id));

    if (storedApiKeys.length === 0) {
      return c.json({
        data: [],
        message: 'No data found',
      });
    }

    const promised = [];

    for (const item of storedApiKeys) {
      promised.push(
        cefiFetcher[item.provider as keyof typeof cefiFetcher]({
          api_key: item.apiKey,
          api_secret: item.apiSecret,
          passphrase: item.passPhrase,
        })
      );
    }

    const data = await Promise.all(promised);
    return c.json({
      data,
    });
  })
  .get(
    '/cefi/:provider',

    async (c) => {
      const user = c.get('user');
      const provider = c.req.param('provider');

      const storedApiKeys = await db
        .select()
        .from(cefiRegistration)
        .where(and(eq(cefiRegistration.ownerId, user.id), eq(cefiRegistration.provider, provider)));

      if (storedApiKeys.length === 0) {
        return c.json({
          data: [],
          message: 'No data found',
        });
      }

      const item = storedApiKeys[0]!;

      const data = await cefiFetcher[provider as keyof typeof cefiFetcher]({
        api_key: item.apiKey,
        api_secret: item.apiSecret,
        passphrase: item.passPhrase,
      });

      return c.json({
        data,
      });
    }
  )
  .get(
    '/defi/:addressType/:address',

    async (c) => {
      const user = c.get('user');
      const addressType = c.req.param('addressType').toLowerCase();
      const address = c.req.param('address').toLowerCase();

      const registered = await db
        .select()
        .from(defiRegistration)
        .where(
          and(
            eq(defiRegistration.ownerId, user.id),
            eq(defiRegistration.addressType, addressType),
            eq(defiRegistration.address, address)
          )
        );

      if (registered.length === 0) {
        return c.json({
          data: [],
          message: 'No data found',
        });
      }

      const item = registered[0]!;

      const foundDefiFecther = defiFetcher[addressType as keyof typeof defiFetcher];

      if (!foundDefiFecther) {
        return c.json({
          data: [],
          message: 'No data found',
        });
      }

      const data = await defiFetcher[addressType as keyof typeof defiFetcher](item.address);

      return c.json({
        data,
      });
    }
  );

export default portfolioRoutes;
