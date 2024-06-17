// src/routes/auth.routes.ts

import { Hono } from "hono";
import { zValidator } from "@/middlewares/zodValidator.middleware";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { startTime, endTime } from "hono/timing";
import { z } from "zod";
import {
  signUp,
  signIn,
  signInWithProvider,
  refreshToken,
} from "@/services/auth/auth.service";

const authRoutes = new Hono();

authRoutes.post(
  "/sign-up",
  zValidator(
    "json",
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
    })
  ),
  async (c) => {
    const { email, password } = c.req.valid("json");
    const user = await signUp(email, password);
    return c.json(user);
  }
);

authRoutes.post(
  "/sign-in",
  zValidator(
    "json",
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
    })
  ),
  async (c) => {
    const { email, password } = c.req.valid("json");

    const data = await signIn(email, password);

    setCookie(c, "access_token", data?.session.access_token, {
      ...(data?.session.expires_at && {
        expires: new Date(data.session.expires_at),
      }),
      httpOnly: true,
      path: "/",
      secure: true,
    });

    setCookie(c, "refresh_token", data?.session.refresh_token, {
      ...(data?.session.expires_at && {
        expires: new Date(data.session.expires_at),
      }),
      httpOnly: true,
      path: "/",
      secure: true,
    });

    return c.json(data.user);
  }
);

authRoutes.post(
  "/sign-in-with-provider",
  zValidator(
    "json",
    z.object({
      provider: z.enum(["google", "apple"]),
      token: z.string().min(8),
      accessToken: z.string().optional(),
    })
  ),
  async (c) => {
    const { token, provider, accessToken } = c.req.valid("json");

    startTime(c, "supabase.auth.signInWithProvider");
    const data = await signInWithProvider(provider, token, accessToken);
    endTime(c, "supabase.auth.signInWithProvider");

    setCookie(c, "access_token", data?.session.access_token, {
      ...(data?.session.expires_at && {
        expires: new Date(data.session.expires_at),
      }),
      httpOnly: true,
      path: "/",
      secure: true,
    });

    setCookie(c, "refresh_token", data?.session.refresh_token, {
      ...(data?.session.expires_at && {
        expires: new Date(data.session.expires_at),
      }),
      httpOnly: true,
      path: "/",
      secure: true,
    });

    return c.json(data.user);
  }
);

authRoutes.get("/refresh", async (c) => {
  const refresh_token = getCookie(c, "refresh_token");
  if (!refresh_token) {
    throw new HTTPException(403, { message: "No refresh token" });
  }

  const data = await refreshToken(refresh_token);

  if (data?.session) {
    setCookie(c, "refresh_token", data.session.refresh_token, {
      ...(data.session.expires_at && {
        expires: new Date(data.session.expires_at),
      }),
      httpOnly: true,
      path: "/",
      secure: true,
    });
  }

  return c.json(data.user);
});

export default authRoutes;