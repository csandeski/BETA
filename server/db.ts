import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from "@shared/schema";
import dns from 'dns';

// Forçar IPv4 para conectar ao Supabase no Replit
dns.setDefaultResultOrder("ipv4first");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use pg para conexão com PostgreSQL (funciona com Supabase pooled)
const { Pool } = pg;
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase.com') ? { rejectUnauthorized: false } : false
});

const db = drizzle(pool, { schema });

export { pool, db };
