const express = require('express');
const router = express.Router();
const pool = require('../db'); // Ajusta según tu estructura de carpetas

// GET /api/citas - listar todas las citas (útil para pruebas)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM citas ORDER BY fecha DESC, hora DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo citas:', error);
    res.status(500).json({ error: 'Error del servidor al obtener las citas.' });
  }
});

// GET /api/citas/user/:userId - obtener citas para un usuario específico
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    // Consulta para traer citas con servicios y barbería para ese usuario
    const citasResult = await pool.query(
      `SELECT c.id, c.fecha, c.hora, b.nombre AS nombre_barberia,
              ARRAY_AGG(s.nombre) AS servicios
       FROM citas c
       JOIN barberias b ON c.barberia_id = b.id
       JOIN cita_servicios cs ON cs.cita_id = c.id
       JOIN servicios s ON cs.servicio_id = s.id
       WHERE c.usuario_id = $1
       GROUP BY c.id, b.nombre, c.fecha, c.hora
       ORDER BY c.fecha DESC, c.hora DESC`,
      [userId]
    );
    res.json(citasResult.rows);
  } catch (error) {
    console.error('Error obteniendo citas por usuario:', error);
    res.status(500).json({ error: 'Error del servidor al obtener las citas del usuario.' });
  }
});

// POST /api/citas - crear nueva cita
router.post('/', async (req, res) => {
  const {
    usuario_id,
    barberia_id,
    barbero_id,
    servicios_id,
    fecha,
    hora
  } = req.body;

  if (!usuario_id || !barberia_id || !barbero_id || !servicios_id || !fecha || !hora) {
    return res.status(400).json({ error: 'Faltan datos obligatorios.' });
  }

  try {
    // Insertar cita
    const insertCitaQuery = `
      INSERT INTO citas (usuario_id, barberia_id, barbero_id, fecha, hora)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;
    const result = await pool.query(insertCitaQuery, [usuario_id, barberia_id, barbero_id, fecha, hora]);
    const citaId = result.rows[0].id;

    // Insertar servicios asociados
    const insertServicioQuery = `
      INSERT INTO cita_servicios (cita_id, servicio_id)
      VALUES ($1, $2);
    `;
    for (const servicioId of servicios_id) {
      await pool.query(insertServicioQuery, [citaId, servicioId]);
    }

    res.status(201).json({ message: 'Cita creada correctamente.', citaId });
  } catch (error) {
    console.error('Error creando cita:', error);
    res.status(500).json({ error: 'Error del servidor al crear la cita.' });
  }
});

module.exports = router;
