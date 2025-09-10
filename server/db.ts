import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from "@shared/schema";
import dns from 'dns';

// Forçar IPv4 para conectar ao Supabase no Replit
dns.setDefaultResultOrder("ipv4first");

// Lazy initialization - só cria a conexão quando for realmente usar
let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

function getDatabase() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      // Em desenvolvimento, pode continuar sem banco de dados
      if (process.env.NODE_ENV === 'development') {
        console.warn("DATABASE_URL not set - database features will be disabled");
        return null;
      }
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    
    // Use pg para conexão com PostgreSQL (funciona com Supabase pooled)
    const { Pool } = pg;
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('supabase.com') ? { rejectUnauthorized: false } : false
    });
    
    db = drizzle(pool, { schema });
  }
  return db;
}

function getPool() {
  if (!pool) {
    getDatabase(); // Inicializa o pool se ainda não foi inicializado
  }
  return pool;
}

export { getPool as pool, getDatabase as db };
