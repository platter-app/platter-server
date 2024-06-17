// src/services/auth.service.ts

import { supabase } from "@/libs/supabase/client";
import { db } from "@/libs/database/db";
import { users } from "@/libs/database/schema";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error || !data?.user?.email) {
    console.log(error?.message);
    if (error?.message === 'duplicate key value violates unique constraint "users_pkey"') {
      throw new HTTPException(422, { message: "User already exists" });
    }

    if (error?.code === "user_already_exists") {
      throw new HTTPException(422, { message: "User already exists" });
    }

    throw new Error(error?.message || "Error while signing up", { cause: error });
  }

  const dbUser = {
    id: data?.user.id,
    email: data?.user.email,
    createdAt: data?.user.created_at,
    updatedAt: data?.user.updated_at,
  };

  const isUserExists = await db.select().from(users).where(eq(users.id, dbUser.id));

  if (isUserExists.length > 0) {
    throw new HTTPException(422, { message: "User already exists" });
  }

  const user = await db.insert(users).values(dbUser).returning();

  return user;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message === "Invalid login credentials") {
      throw new HTTPException(401, { message: "Invalid login credentials" });
    }
    throw new HTTPException(401, { message: error.message });
  }

  return data;
};

export const refreshToken = async (refresh_token: string) => {
  const { data, error } = await supabase.auth.refreshSession({ refresh_token });

  if (error) {
    console.error("Error while refreshing token", error);
    throw new HTTPException(403, { message: error.message });
  }

  return data;
};

export const signInWithProvider = async (provider: 'google' | 'apple', token: string, accessToken?: string) => {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider,
    token,
    access_token: accessToken,
  });

  if (error) {
    console.error(`Error while signing in with ${provider} provider`, error);
    throw new HTTPException(401, { message: error.message });
  }

  return data;
};