const express = require('express');
const router = express.Router();
const pool = require('../db'); // Ajusta la ruta si es necesario

// POST /api/citas - Crear nueva cita
router.post('/', async (req, res) => {
  const {
    usuario_id, // ID del cliente
    barberia_id,
    barbero_id,  // ID del barbero (el que se guarda en la tabla 'citas')
    servicios_id,
    fecha,
    hora,
  } = req.body;

  console.log('>>> Datos recibidos para crear cita:', req.body);

  // Validar campos obligatorios
  if (
    !usuario_id ||
    !barberia_id ||
    !barbero_id || // Aquí barbero_id es el ID que identifica al barbero en la tabla 'citas'
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
      barbero_id, // Este es el barbero_id que se guarda
      fecha,
      hora,
    ]);

    const citaId = result.rows[0].id;
    console.log(`Cita creada con ID: ${citaId}`);

    // Insertar los servicios asociados a la cita
    // Asegúrate que tu tabla se llama 'cita_servicios' y no 'servicios_citas' (era 'servicios_citas' en mi ejemplo anterior)
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

// GET /api/citas/user/:userId - Obtener citas por usuario (CLIENTE)
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params; // Este es el usuarios.id del CLIENTE

  console.log(`Consultando citas para el cliente con usuario ID: ${userId}`);

  try {
    // La consulta para el cliente parece correcta, asumiendo que:
    // - c.barbero_id se une con barberos.id
    // - barberos.usuario_id se une con users.id (para obtener el nombre del barbero)
    const query = `
      SELECT
        c.id,
        c.fecha,
        c.hora,
        b_info.nombre AS nombre_barberia, -- Asumiendo que tu tabla es 'barberias' y no 'barbershops'
        u_barbero.name AS nombre_barbero, -- Nombre del barbero desde la tabla 'users'
        ARRAY_AGG(s.nombre) AS servicios -- Nombres de los servicios
      FROM citas c
      JOIN barberias b_info ON c.barberia_id = b_info.id -- Cambiado 'barbershops' a 'barberias' según tu estructura
      JOIN barberos bar_profile ON c.barbero_id = bar_profile.id -- c.barbero_id es el ID de la tabla 'barberos'
      JOIN users u_barbero ON bar_profile.usuario_id = u_barbero.id -- Para obtener el nombre del barbero
      JOIN cita_servicios cs ON cs.cita_id = c.id
      JOIN servicios s ON s.id = cs.servicio_id
      WHERE c.usuario_id = $1 -- Filtrar por el ID del cliente
      GROUP BY c.id, c.fecha, c.hora, b_info.nombre, u_barbero.name
      ORDER BY c.fecha DESC, c.hora DESC;
    `;

    const result = await pool.query(query, [userId]);

    // No es un error si no hay citas, simplemente un array vacío
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo citas del cliente:', error);
    res.status(500).json({ error: 'Error del servidor al obtener las citas del cliente.' });
  }
});


// --- NUEVO ENDPOINT PARA CITAS DEL BARBERO ---
// GET /api/citas/barber/:barberUserId - Obtener citas por ID de USUARIO del barbero
router.get('/barber/:barberUserId', async (req, res) => {
  const { barberUserId } = req.params; // Este es el 'usuarios.id' del BARBERO

  console.log(`Consultando citas para el barbero con usuario ID: ${barberUserId}`);

  if (!barberUserId || isNaN(parseInt(barberUserId))) {
    return res.status(400).json({ error: 'ID de barbero (usuario) inválido.' });
  }

  try {
    // ASUNCIÓN IMPORTANTE:
    // 1. Tienes una tabla 'barberos' con columnas 'id' (PK de barberos) y 'usuario_id' (FK a users.id).
    // 2. En la tabla 'citas', la columna 'barbero_id' almacena el 'id' de la tabla 'barberos'.

    const query = `
      SELECT
        c.id,
        c.fecha,
        c.hora,
        b_info.nombre AS nombre_barberia,
        u_cliente.name AS nombre_cliente, -- Nombre del cliente desde la tabla 'users'
        ARRAY_AGG(s.nombre) AS servicios_nombres -- Nombres de los servicios
      FROM citas c
      JOIN barberias b_info ON c.barberia_id = b_info.id
      JOIN users u_cliente ON c.usuario_id = u_cliente.id -- Para obtener el nombre del cliente
      JOIN barberos bar_profile ON c.barbero_id = bar_profile.id -- Unir citas con la tabla 'barberos'
      JOIN cita_servicios cs ON cs.cita_id = c.id
      JOIN servicios s ON s.id = cs.servicio_id
      WHERE bar_profile.usuario_id = $1 -- Filtrar por el 'usuario_id' del barbero en la tabla 'barberos'
      GROUP BY c.id, c.fecha, c.hora, b_info.nombre, u_cliente.name
      ORDER BY c.fecha ASC, c.hora ASC; -- O el orden que prefieras para el barbero
    `;

    const result = await pool.query(query, [barberUserId]);

    res.json(result.rows); // Devuelve un array vacío si no hay citas
  } catch (err) {
    console.error(`Error al obtener citas para el barbero (usuario_id ${barberUserId}):`, err.message);
    res.status(500).json({ error: 'Error interno del servidor al obtener citas del barbero.' });
  }
});


module.exports = router;