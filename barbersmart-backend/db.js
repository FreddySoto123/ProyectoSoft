// db.js
const {Pool} = require('pg');
require('dotenv').config(); // Para cargar DATABASE_URL localmente

let poolConfig;

if (process.env.DATABASE_URL) {
  // Usar connectionString para Neon/Vercel Postgres u otras BDs en la nube
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Necesario para Neon y muchos proveedores de BD en la nube
      // En un entorno de producción muy estricto, podrías necesitar configurar certificados CA
    },
  };
  console.log(
    'INFO: Conectando a PostgreSQL usando DATABASE_URL (probablemente en la nube).',
  );
} else {
  // Configuración para desarrollo local tradicional (si no tienes DATABASE_URL)
  // Esta parte se volverá menos relevante si siempre usas DATABASE_URL, incluso para desarrollo local apuntando a Neon.
  poolConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
  };
  console.log(
    'INFO: Conectando a PostgreSQL usando configuración de host/usuario local.',
  );
}

const pool = new Pool(poolConfig);

// Opcional: Prueba de conexión al iniciar (puede ser útil)
pool
  .query('SELECT NOW()')
  .then(res =>
    console.log(
      '✅ Conexión inicial al Pool de PostgreSQL exitosa. Hora BD:',
      res.rows[0].now,
    ),
  )
  .catch(err =>
    console.error(
      '🔥 Error en la conexión inicial al Pool de PostgreSQL:',
      err.stack,
    ),
  );

module.exports = pool;
