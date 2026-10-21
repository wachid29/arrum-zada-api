const db = require('../src/config/db');

async function migrate() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone_number VARCHAR(25) NOT NULL,
        nip VARCHAR(50) NOT NULL UNIQUE,
        position VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('Super Admin', 'Administrator')),
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nip ON users (nip);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
  `;

  try {
    await db.query(sql);
    console.log('✅ Migrasi tabel users dan indeks berhasil dijalankan.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Gagal menjalankan migrasi:', error);
    process.exit(1);
  }
}

migrate();
