// barbersmart-backend/index.js

const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN DE CORS ---
const allowedOrigins = [
  'http://localhost:8081', // Expo Go
  'http://localhost:19006', // Expo Web local (si usas este puerto)
  // También puedes añadir tu puerto de desarrollo web local si es diferente, ej. http://localhost:3000
];
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`); // El dominio del despliegue actual de Vercel
}
if (process.env.FRONTEND_PRODUCTION_URL) {
  // Para un dominio personalizado de producción si lo tienes
  allowedOrigins.push(process.env.FRONTEND_PRODUCTION_URL);
}
const vercelPreviewPattern = /^https:\/\/barbersmart-.*\.vercel\.app$/; // Para previews de tu proyecto "barbersmart"

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin || // Permite Postman, curl, etc.
        allowedOrigins.includes(origin) ||
        (origin && vercelPreviewPattern.test(origin))
      ) {
        callback(null, true);
      } else {
        console.warn(`CORS: Origen bloqueado -> ${origin}`);
        callback(new Error(`El origen ${origin} no está permitido por CORS.`));
      }
    },
    credentials: true, // Si usas cookies o cabeceras de autorización que deban ser pasadas
  }),
);

// MIDDLEWARES GLOBALES
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// RUTAS DE LA APLICACIÓN (SIN EL PREFIJO /api/ AQUÍ)
const authRoutes = require('./routes/auth');
const barbershopRoutes = require('./routes/barbershopRoutes');
const barberRoutes = require('./routes/barberRoutes');
const styleRoutes = require('./routes/styleRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
// Si citas.routes.js es diferente a appointmentRoutes y realmente lo usas:
// const citasRoutes = require('./routes/citas.routes');

// Montaje de rutas (sin el prefijo /api/)
app.use('/auth', authRoutes);
app.use('/barbershops', barbershopRoutes);
app.use('/barbers', barberRoutes);
app.use('/styles', styleRoutes);
app.use('/simulations', simulationRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/services', serviceRoutes);
// Si usas citasRoutes para algo diferente:
// app.use('/citas', citasRoutes);

// RUTA DE ESTADO DE LA API (AHORA EN LA RAÍZ DEL CONTEXTO DEL BACKEND)
// Será accesible a través de https://<tu-dominio>.vercel.app/api/
app.get('/', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    res.json({
      message:
        'API de BarberSmart (manejada por /barbersmart-backend/index.js) está funcionando!',
      databaseConnected: true,
      databaseTime: dbResult.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      message: 'API funcionando, pero hay un problema con la BD.',
      databaseConnected: false,
      error: error.message,
    });
  }
});

// INICIAR EL SERVIDOR (Solo para desarrollo local)
if (process.env.NODE_ENV !== 'production_vercel') {
  // O usa una variable como VERCEL_ENV que Vercel sí establece
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(
      `🚀 Servidor backend corriendo en http://localhost:${PORT} (desarrollo local)`,
    );
    pool
      .query('SELECT NOW()')
      .then(resDb =>
        console.log(
          '🎉 Conexión inicial a PostgreSQL exitosa (local). Hora BD:',
          resDb.rows[0].now,
        ),
      )
      .catch(errDb =>
        console.error(
          '🔥 Error en conexión inicial a PostgreSQL (local):',
          errDb.stack,
        ),
      );
  });
}

module.exports = app;
