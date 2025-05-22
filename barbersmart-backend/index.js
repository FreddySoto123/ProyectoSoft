const express = require('express');
const pool = require('./db'); // ← Importamos la conexión
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({connected: true, time: result.rows[0].now});
  } catch (error) {
    console.error('❌ Error al conectar con PostgreSQL:', error.message);
    res.status(500).json({connected: false, error: error.message});
  }
});
const authRoutes = require('./routes/auth');
const barbershopRoutes = require('./routes/barbershopRoutes'); // Nuevas rutas de barberías

app.use(express.json()); // Asegúrate de que esté antes de usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/barbershops', barbershopRoutes); // Montar las nuevas rutas

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
