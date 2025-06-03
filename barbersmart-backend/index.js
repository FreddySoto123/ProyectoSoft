const express = require('express');
const pool = require('./db'); // Importamos la conexión a la BD
require('dotenv').config(); // Para cargar variables de entorno desde .env

const app = express();
const PORT = process.env.PORT || 3001;

// MIDDLEWARES GLOBALES
// --------------------

// Middleware para parsear cuerpos de solicitud JSON
app.use(express.json());

// Middleware para parsear cuerpos de solicitud URL-encoded (menos común para APIs JSON, pero no hace daño)
app.use(express.urlencoded({extended: true}));

// RUTAS DE LA APLICACIÓN
// --------------------
const authRoutes = require('./routes/auth');
const barbershopRoutes = require('./routes/barbershopRoutes');
const barberRoutes = require('./routes/barberRoutes');
const styleRoutes = require('./routes/styleRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
// Aquí importarías otros archivos de rutas (ej. appointmentRoutes, serviceRoutes, etc.)

app.use('/api/auth', authRoutes); // Rutas para autenticación y perfil de usuario
app.use('/api/barbershops', barbershopRoutes); // Rutas para barberías
app.use('/api/barbers', barberRoutes); // Rutas para perfiles de barberos
app.use('/api/styles', styleRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/appointments', appointmentRoutes);
// app.use('/api/appointments', appointmentRoutes); // Ejemplo

// RUTA DE PRUEBA DE CONEXIÓN A LA BASE DE DATOS Y ESTADO DEL SERVIDOR
// -----------------------------------------------------------------
app.get('/', async (req, res) => {
  try {
    // Prueba la conexión a la base de datos
    const dbResult = await pool.query('SELECT NOW()');
    console.log(
      '✅ Conexión a PostgreSQL verificada. Hora del servidor de BD:',
      dbResult.rows[0].now,
    );
    res.json({
      message: 'API de BarberSmart está funcionando!',
      databaseConnected: true,
      databaseTime: dbResult.rows[0].now,
    });
  } catch (error) {
    console.error(
      '❌ Error al conectar con PostgreSQL en la ruta principal:',
      error.message,
    );
    res.status(500).json({
      message:
        'API de BarberSmart está funcionando, pero hay un problema con la base de datos.',
      databaseConnected: false,
      error: error.message,
    });
  }
});

// INICIAR EL SERVIDOR
// -----------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  // Opcional: Puedes hacer una prueba de conexión a la BD aquí también al iniciar,
  // como tenías en db.js, para verla inmediatamente en la consola del servidor.
  pool
    .query('SELECT NOW()')
    .then(res =>
      console.log(
        '🎉 Conexión inicial a PostgreSQL exitosa. Hora BD:',
        res.rows[0].now,
      ),
    )
    .catch(err =>
      console.error('🔥 Error en la conexión inicial a PostgreSQL:', err.stack),
    );
});
