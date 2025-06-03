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

module.exports = router;
