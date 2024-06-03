import { supabase } from '@/libs/supabase/client';
import { zValidator } from '@/middlewares/zodValidator.middleware';

import { db } from '@/libs/database/db';
import { users, cefiRegistration, defiRegistration } from '@/libs/database/schema';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { endTime, startTime } from 'hono/timing';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import authMiddleware from '@/middlewares/auth.middleware';
import WAValidator from 'multicoin-address-validator';
const availableProviders = ['binance', 'okx', 'coinone', 'upbit', 'bithumb', 'gopax', 'korbit'] as const;
const availableAddressType = ['evm', 'sol', 'stacks', 'ton'] as const;

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
  // cefi 등록
  .post(
    '/cefi',
    zValidator(
      'json',
      z.object({
        provider: z.enum(availableProviders),
        apiKey: z.string(),
        apiSecret: z.string(),
        passPhrase: z.string().optional(),
      })
    ),
    async (c) => {
      const user = c.get('user');
      const { provider, apiKey, apiSecret, passPhrase } = c.req.valid('json');

      // Provider 중복 등록 체크
      const storedApiKeys = await db.select().from(cefiRegistration).where(eq(cefiRegistration.ownerId, user.id));
      const isRegistered = storedApiKeys.some((item) => item.provider === provider);
      if (isRegistered) {
        throw new HTTPException(409, {
          message: `Provider ${provider} Data already exists`,
        });
      }

      // OKX 의 경우, passphrase 는 필수
      if (provider === 'okx' && !passPhrase) {
        throw new HTTPException(400, {
          message: 'Passphrase is required for OKX',
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
      const apiKeyRegistration = await db.insert(cefiRegistration).values(dbCefiRegistration).returning();

      // console.log(apiKeyRegistration);

      return c.json({
        message: 'Registered successfully',
      });
    }
  )
  .post(
    '/defi',
    zValidator(
      'json',
      z.object({
        addressType: z.enum(availableAddressType),
        address: z.string(),
        alias: z.string().optional(),
      })
    ),
    async (c) => {
      const user = c.get('user');
      const { addressType, address, alias } = c.req.valid('json');

      const dbDeFiRegistration = {
        ownerId: user.id,
        addressType,
        address,
        alias,
      };

      let addressValidation = true;
      if (addressType === 'evm') {
        addressValidation = WAValidator.validate(address, 'ETH');
      } else if (addressType === 'sol') {
        addressValidation = WAValidator.validate(address, 'SOL');
      }
      // WAValidtor 는 현재 stacks, ton을 지원하지 않고 있음.
      // else if (addressType === 'stacks') {
      //   addressValidation = WAValidator.validate(address, 'STX');
      // }

      if (!addressValidation) {
        throw new HTTPException(400, {
          message: `Invalid ${addressType} address format`,
        });
      }

      const apiKeyRegistration = await db.insert(defiRegistration).values(dbDeFiRegistration).returning();

      return c.json({
        message: 'Registered successfully',
      });
    }
  )
  .get(
    '/cefi',

    async (c) => {
      const user = c.get('user');

      const storedApiKeys = await db.select().from(cefiRegistration).where(eq(cefiRegistration.ownerId, user.id));

      const data = storedApiKeys.map((item) => {
        return {
          provider: item.provider,
          apiKey: item.apiKey,
        };
      });

      return c.json({
        data,
      });
    }
  )
  .get('/defi', async (c) => {
    const user = c.get('user');

    const storedDefiRegistration = await db
      .select()
      .from(defiRegistration)
      .where(eq(defiRegistration.ownerId, user.id));

    const data = storedDefiRegistration.map((item) => {
      return {
        addressType: item.addressType,
        address: item.address,
        alias: item.alias,
      };
    });

    return c.json({
      data,
    });
  });

export default registerRoutes;
