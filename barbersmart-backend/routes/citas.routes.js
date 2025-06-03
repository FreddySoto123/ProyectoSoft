const express = require('express');
const router = express.Router();
const pool = require('../db'); // Ajusta la ruta si es necesario

// POST /api/citas - Crear nueva cita
router.post('/', async (req, res) => {
  const {
    usuario_id,
    barberia_id,
    barbero_id,
    servicios_id,
    fecha,
    hora,
  } = req.body;

  console.log('>>> Datos recibidos para crear cita:', req.body);

  // Validar campos obligatorios
  if (
    !usuario_id ||
    !barberia_id ||
    !barbero_id ||
    !servicios_id ||
    !Array.isArray(servicios_id) ||
    servicios_id.length === 0 ||
    !fecha ||
    !hora
  ) {
    console.warn('Datos incompletos o incorrectos:', req.body);
    return res.status(400).json({ error: 'Faltan datos obligatorios o servicios inválidos.' });
  }

  try {
    // Insertar la cita principal
    const insertCitaQuery = `
      INSERT INTO citas (usuario_id, barberia_id, barbero_id, fecha, hora)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;

    const result = await pool.query(insertCitaQuery, [
      usuario_id,
      barberia_id,
      barbero_id,
      fecha,
      hora,
    ]);

    const citaId = result.rows[0].id;
    console.log(`Cita creada con ID: ${citaId}`);

    // Insertar los servicios asociados a la cita
    const insertServicioQuery = `
      INSERT INTO cita_servicios (cita_id, servicio_id)
      VALUES ($1, $2);
    `;

    for (const servicioId of servicios_id) {
      console.log(`Insertando servicio ID ${servicioId} para cita ID ${citaId}`);
      await pool.query(insertServicioQuery, [citaId, servicioId]);
    }

    console.log('Todos los servicios insertados correctamente.');

    res.status(201).json({ message: 'Cita creada correctamente.', citaId });
  } catch (error) {
    console.error('Error creando cita:', error);
    res.status(500).json({ error: error.message || 'Error del servidor al crear la cita.' });
  }
});

// GET /api/citas/user/:userId - Obtener citas por usuario
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  console.log(`Consultando citas para usuario con ID: ${userId}`);

  try {
    const query = `
      SELECT
        c.id,
        c.fecha,
        c.hora,
        b.nombre AS nombre_barberia,
        u.name AS nombre_barbero,
        ARRAY_AGG(s.nombre) AS servicios
      FROM citas c
      JOIN barberias b ON c.barberia_id = b.id
      JOIN barberos bar ON c.barbero_id = bar.id
      JOIN users u ON bar.usuario_id = u.id
      JOIN cita_servicios cs ON cs.cita_id = c.id
      JOIN servicios s ON s.id = cs.servicio_id
      WHERE c.usuario_id = $1
      GROUP BY c.id, c.fecha, c.hora, b.nombre, u.name
      ORDER BY c.fecha DESC, c.hora DESC
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontraron citas para este usuario.' });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo citas:', error);
    res.status(500).json({ error: 'Error del servidor al obtener las citas.' });
  }
});

module.exports = router;
