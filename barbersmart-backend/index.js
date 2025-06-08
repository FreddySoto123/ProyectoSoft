// barbersmart-backend/index.js

const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Importamos la conexión a la BD
require('dotenv').config(); // Para cargar variables de entorno desde .env

const app = express();
// const PORT = process.env.PORT || 3001; // PORT será manejado por Vercel en producción

// --- CONFIGURACIÓN DE CORS ---
// Es mejor configurar CORS de forma más granular para producción
const allowedOrigins = [
  'http://localhost:8081', // Expo Go (o el puerto que uses para dev del frontend)
  'http://localhost:3000', // Si usas otro puerto para dev web del frontend
];
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}
if (process.env.FRONTEND_PRODUCTION_URL) {
  // Si tienes un dominio personalizado de producción
  allowedOrigins.push(process.env.FRONTEND_PRODUCTION_URL);
}
// Para permitir todas las previews de Vercel de tu proyecto (si el nombre del proyecto es 'barbersmart')
const vercelPreviewPattern = /^https:\/\/barbersmart-.*\.vercel\.app$/;

app.use(
  cors({
    origin: function (origin, callback) {
      // Permite solicitudes sin 'origin' (ej. Postman, curl) O si el origen está en la lista/patrón
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (origin && vercelPreviewPattern.test(origin))
      ) {
        callback(null, true);
      } else {
        console.warn(`CORS: Origen bloqueado -> ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    // methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Asegúrate de incluir OPTIONS para preflight
    credentials: true,
  }),
);

// MIDDLEWARES GLOBALES
// --------------------
app.use(express.json()); // Middleware para parsear cuerpos de solicitud JSON
app.use(express.urlencoded({extended: true})); // Descomentar si esperas datos form-urlencoded

// RUTAS DE LA APLICACIÓN
// --------------------
const authRoutes = require('./routes/auth');
const barbershopRoutes = require('./routes/barbershopRoutes');
const barberRoutes = require('./routes/barberRoutes');
const styleRoutes = require('./routes/styleRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const citasRoutes = require('./routes/citas.routes'); // Parece que tenías dos referencias a citas/appointments

// Montaje de rutas
app.use('/api/auth', authRoutes);
app.use('/api/barbershops', barbershopRoutes); // Cambiado para consistencia (plural)
app.use('/api/barbers', barberRoutes);
app.use('/api/styles', styleRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/appointments', appointmentRoutes); // Usar este para todas las citas
app.use('/api/services', serviceRoutes); // Cambiado para consistencia (plural)
app.use('/api/citas', citasRoutes); // Comentado, ya que /api/appointments parece ser la principal

// RUTA DE PRUEBA DE CONEXIÓN A LA BASE DE DATOS Y ESTADO DEL SERVIDOR
// -----------------------------------------------------------------
app.get('/api', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    console.log(
      '✅ Conexión a PostgreSQL verificada. Hora BD:',
      dbResult.rows[0].now,
    );
    res.json({
      message: 'API de BarberSmart está funcionando!',
      databaseConnected: true,
      databaseTime: dbResult.rows[0].now,
    });
  } catch (error) {
    console.error(
      '❌ Error al conectar con PostgreSQL en /api:',
      error.message,
    );
    res.status(500).json({
      message: 'API funcionando, pero hay un problema con la BD.',
      databaseConnected: false,
      error: error.message,
    });
  }
});

// INICIAR EL SERVIDOR (Solo para desarrollo local)
// -----------------
// En Vercel, Vercel se encarga de iniciar el servidor a través del 'module.exports'.
// Esta sección 'app.listen' no se ejecutará en Vercel.
if (process.env.NODE_ENV !== 'production_vercel') {
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

// ¡IMPORTANTE PARA VERCEL! Exportar la app de Express.
module.exports = app;
