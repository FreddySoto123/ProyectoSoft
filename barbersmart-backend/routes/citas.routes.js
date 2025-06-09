// backend/routes/citas.routes.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Ajusta la ruta si es necesario

// Middleware de ejemplo para simular autenticación (REEMPLAZA CON TU AUTENTICACIÓN REAL)
const authenticateCliente = (req, res, next) => {
  console.log('DEBUG AUTH MIDDLEWARE: Headers recibidos:', req.headers); // Log para ver todos los headers
  const simulatedAuthUserId = req.headers['x-user-id']; // Frontend debe enviar este header con el ID del cliente

  if (simulatedAuthUserId && !isNaN(parseInt(simulatedAuthUserId, 10))) {
    req.user = { userId: parseInt(simulatedAuthUserId, 10) };
    console.log(`DEBUG AUTH MIDDLEWARE: Usuario autenticado simulado ID: ${req.user.userId}`);
    next();
  } else {
    console.warn('DEBUG AUTH MIDDLEWARE: No se proporcionó x-user-id válido en los headers.');
    // En un sistema real, aquí devolverías un error 401 si no hay token/autenticación válida
    // return res.status(401).json({ error: 'Acceso no autorizado. Se requiere autenticación.' });
    // Para pruebas, si quieres permitir que continúe sin un usuario (lo que podría fallar después):
    // next();
    // O, para este endpoint específico, es mejor retornar un error si no hay usuario:
    return res.status(401).json({ error: 'Autenticación simulada fallida: falta x-user-id o no es un número.' });
  }
};


// --- POST /api/citas - Crear nueva cita ---
router.post('/', authenticateCliente, async (req, res) => {
  const {
    barberia_id,
    barbero_id,
    servicios_id,
    fecha,
    hora,
    monto_total,
    notas_cliente
  } = req.body;

  const usuario_id = req.user?.userId;

  if (!usuario_id) {
      console.warn('BACKEND POST /citas: Usuario no autenticado (req.user.userId es undefined).');
      return res.status(401).json({ error: 'Usuario no autenticado para crear cita.' });
  }

  console.log(`>>> BACKEND POST /citas (Usuario ID: ${usuario_id}): Datos recibidos:`, req.body);

  if (!barberia_id || !barbero_id || !servicios_id || !Array.isArray(servicios_id) || servicios_id.length === 0 || !fecha || !hora) {
    console.warn('BACKEND POST /citas: Datos incompletos.');
    return res.status(400).json({ error: 'Faltan datos obligatorios o servicios inválidos.' });
  }

  const montoTotalNumerico = monto_total !== undefined ? parseFloat(monto_total) : null;
  if (monto_total !== undefined && (isNaN(montoTotalNumerico) || montoTotalNumerico < 0)) {
    console.warn('BACKEND POST /citas: Monto total inválido:', monto_total);
    return res.status(400).json({ error: 'Monto total inválido.' });
  }

  const estadoInicial = 'Pendiente';
  const notasClienteFinal = notas_cliente || 'Sin notas.';

  try {
    const insertCitaQuery = `
      INSERT INTO citas (usuario_id, barberia_id, barbero_id, fecha, hora, monto_total, estado_de_cita, notas_cliente)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id;
    `;
    const values = [usuario_id, barberia_id, barbero_id, fecha, hora, montoTotalNumerico, estadoInicial, notasClienteFinal];
    const result = await pool.query(insertCitaQuery, values);
    const citaId = result.rows[0].id;
    console.log(`BACKEND POST /citas: Cita creada con ID: ${citaId}`);

    const insertServicioQuery = `INSERT INTO cita_servicios (cita_id, servicio_id) VALUES ($1, $2);`;
    for (const servicioId of servicios_id) {
      await pool.query(insertServicioQuery, [citaId, servicioId]);
    }
    console.log('BACKEND POST /citas: Servicios asociados insertados.');

    const detalleCitaQuery = `
        SELECT
            c.id, c.fecha, c.hora, c.estado_de_cita, c.notas_cliente,
            c.monto_total AS precio_total,
            u_cliente.name AS nombre_cliente,
            u_cliente.avatar AS avatar_cliente,
            (SELECT SUM(s.duracion_estimada_minutos) FROM cita_servicios cs_d JOIN servicios s ON s.id = cs_d.servicio_id WHERE cs_d.cita_id = c.id) AS duracion_total_estimada,
            ARRAY_AGG(s_n.nombre) AS servicios_nombres
        FROM citas c
        JOIN users u_cliente ON c.usuario_id = u_cliente.id
        LEFT JOIN cita_servicios cs_s ON cs_s.cita_id = c.id
        LEFT JOIN servicios s_n ON s_n.id = cs_s.servicio_id
        WHERE c.id = $1
        GROUP BY c.id, u_cliente.name, u_cliente.avatar;
    `;
    const nuevaCitaResult = await pool.query(detalleCitaQuery, [citaId]);
    console.log(`BACKEND POST /citas: A punto de enviar respuesta para cita ID ${citaId}.`);
    res.status(201).json({ message: 'Cita creada correctamente.', cita: nuevaCitaResult.rows[0] });
    console.log(`BACKEND POST /citas: Respuesta enviada para cita ID ${citaId}.`);
  } catch (error) {
    console.error('BACKEND POST /citas: Error creando cita:', error.message, error.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error del servidor al crear la cita.' });
    }
  }
});

// --- GET /api/citas/user/:userId - Obtener citas del CLIENTE ---
router.get('/user/:userId', authenticateCliente, async (req, res) => {
  const { userId } = req.params;
  const clienteIdAutenticado = req.user?.userId;

  console.log(`BACKEND GET /citas/user/${userId}: Solicitado por usuario autenticado ID ${clienteIdAutenticado}.`);

  if (parseInt(userId, 10) !== clienteIdAutenticado) {
      console.warn(`BACKEND GET /citas/user/${userId}: Intento de acceso no autorizado por usuario ${clienteIdAutenticado}.`);
      return res.status(403).json({ error: 'No tienes permiso para ver estas citas.' });
  }

  console.log(`BACKEND GET /citas/user/${userId}: Consultando citas para el cliente.`);
  try {
    const query = `
      SELECT
        c.id, c.fecha, c.hora, c.estado_de_cita, c.notas_cliente,
        c.monto_total AS precio_total,
        b_info.nombre AS nombre_barberia,
        u_barbero.name AS nombre_barbero,
        ARRAY_AGG(s_n.nombre) AS servicios
      FROM citas c
      JOIN barberias b_info ON c.barberia_id = b_info.id
      JOIN barberos bar_profile ON c.barbero_id = bar_profile.id
      JOIN users u_barbero ON bar_profile.usuario_id = u_barbero.id
      LEFT JOIN cita_servicios cs_s ON cs_s.cita_id = c.id
      LEFT JOIN servicios s_n ON s_n.id = cs_s.servicio_id
      WHERE c.usuario_id = $1
      GROUP BY c.id, b_info.nombre, u_barbero.name
      ORDER BY c.fecha DESC, c.hora DESC;
    `;
    const result = await pool.query(query, [userId]);
    console.log(`BACKEND GET /citas/user/${userId}: Query completada. Citas encontradas: ${result.rows.length}.`);
    console.log(`BACKEND GET /citas/user/${userId}: Datos de citas:`, JSON.stringify(result.rows, null, 2));
    console.log(`BACKEND GET /citas/user/${userId}: A punto de enviar respuesta JSON.`);
    res.json(result.rows);
    console.log(`BACKEND GET /citas/user/${userId}: Respuesta JSON enviada.`);
  } catch (error) {
    console.error(`BACKEND GET /citas/user/${userId}: Error obteniendo citas:`, error.message, error.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error del servidor al obtener las citas del cliente.' });
    }
  }
});

// --- GET /api/citas/barber/:barberUserId - Obtener citas del BARBERO ---
router.get('/barber/:barberUserId', async (req, res) => {
  const { barberUserId } = req.params;
  console.log(`BACKEND GET /citas/barber/${barberUserId}: INICIO - Consultando citas.`);

  if (!barberUserId || isNaN(parseInt(barberUserId))) { /* ... */ }
  try {
    const query = `
      SELECT
        c.id, c.fecha, c.hora, c.estado_de_cita, c.notas_cliente,
        c.monto_total AS precio_total,
        b_info.nombre AS nombre_barberia,
        u_cliente.name AS nombre_cliente,
        u_cliente.avatar AS avatar_cliente,
        ARRAY_AGG(s_n.nombre) AS servicios_nombres
      FROM citas c
      JOIN barberias b_info ON c.barberia_id = b_info.id
      JOIN users u_cliente ON c.usuario_id = u_cliente.id
      JOIN barberos bar_profile ON c.barbero_id = bar_profile.id
      JOIN users u_barbero_profile ON bar_profile.usuario_id = u_barbero_profile.id
      LEFT JOIN cita_servicios cs_s ON cs_s.cita_id = c.id
      LEFT JOIN servicios s_n ON s_n.id = cs_s.servicio_id
      WHERE u_barbero_profile.id = $1
      GROUP BY c.id, b_info.nombre, u_cliente.name, u_cliente.avatar
      ORDER BY c.fecha ASC, c.hora ASC;
    `;
    /* ... logs y pool.query como antes ... */
    const result = await pool.query(query, [barberUserId]);
    console.log(`BACKEND GET /citas/barber/${barberUserId}: Query completada. Citas encontradas: ${result.rows.length}`);
    res.json(result.rows);
  } catch (err) { /* ... */ }
});

// --- GET /api/citas/:citaId - Obtener detalle de UNA cita ---
router.get('/:citaId', async (req, res) => {
    const { citaId } = req.params;
    console.log(`BACKEND GET /citas/${citaId}: INICIO - Obteniendo detalle.`);
    try {
        const query = `
            SELECT
                c.id, c.fecha, c.hora, c.estado_de_cita, c.notas_cliente,
                c.monto_total AS precio_total,
                u_cliente.name AS nombre_cliente,
                u_cliente.avatar AS avatar_cliente,
                (SELECT SUM(s.duracion_estimada_minutos) FROM cita_servicios cs_d JOIN servicios s ON s.id = cs_d.servicio_id WHERE cs_d.cita_id = c.id) AS duracion_total_estimada,
                ARRAY_AGG(s_n.nombre) AS servicios_nombres
            FROM citas c
            JOIN users u_cliente ON c.usuario_id = u_cliente.id
            LEFT JOIN cita_servicios cs_s ON cs_s.cita_id = c.id
            LEFT JOIN servicios s_n ON s_n.id = cs_s.servicio_id
            WHERE c.id = $1
            GROUP BY c.id, u_cliente.name, u_cliente.avatar;
        `;
        /* ... logs y pool.query como antes ... */
        const result = await pool.query(query, [citaId]);
        if (result.rows.length === 0) { /* ... 404 ...*/ }
        res.json(result.rows[0]);
    } catch (error) { /* ... */ }
});

// --- PUT /api/citas/:citaId/estado - Actualizar estado por BARBERO ---
router.put('/:citaId/estado', async (req, res) => { // Asume autenticación de Barbero (no implementada aquí)
    const { citaId } = req.params;
    const { nuevoEstado } = req.body;
    console.log(`BACKEND PUT /citas/${citaId}/estado (BARBERO): INICIO - Cambiando a: ${nuevoEstado}`);

    const estadosValidosPorBarbero = ['Aceptada', 'Rechazada_barbero', 'Completada'];
    if (!estadosValidosPorBarbero.includes(nuevoEstado)) {
        return res.status(400).json({ error: 'Acción de estado no válida para el barbero.' });
    }

    try {
        const updateQuery = `UPDATE citas SET estado_de_cita = $1, updated_at = NOW() WHERE id = $2 RETURNING id;`;
        const updateResult = await pool.query(updateQuery, [nuevoEstado, citaId]);

        if (updateResult.rows.length === 0) {
             return res.status(404).json({ error: 'Cita no encontrada o no se pudo actualizar.' });
        }

        const detalleCitaQuery = ` /* ... Misma query de GET /:citaId ... */
            SELECT
                c.id, c.fecha, c.hora, c.estado_de_cita, c.notas_cliente,
                c.monto_total AS precio_total,
                u_cliente.name AS nombre_cliente,
                u_cliente.avatar AS avatar_cliente,
                (SELECT SUM(s.duracion_estimada_minutos) FROM cita_servicios cs_d JOIN servicios s ON s.id = cs_d.servicio_id WHERE cs_d.cita_id = c.id) AS duracion_total_estimada,
                ARRAY_AGG(s_n.nombre) AS servicios_nombres
            FROM citas c
            JOIN users u_cliente ON c.usuario_id = u_cliente.id
            LEFT JOIN cita_servicios cs_s ON cs_s.cita_id = c.id
            LEFT JOIN servicios s_n ON s_n.id = cs_s.servicio_id
            WHERE c.id = $1
            GROUP BY c.id, u_cliente.name, u_cliente.avatar;
        `;
        const citaActualizadaResult = await pool.query(detalleCitaQuery, [citaId]);
        console.log(`BACKEND PUT /citas/${citaId}/estado (BARBERO): Estado actualizado. A punto de enviar respuesta.`);
        res.json({ message: `Cita ${nuevoEstado.toLowerCase()}.`, cita: citaActualizadaResult.rows[0] });
        console.log(`BACKEND PUT /citas/${citaId}/estado (BARBERO): Respuesta enviada.`);

    } catch (error) {
        console.error(`BACKEND PUT /citas/${citaId}/estado (BARBERO): ERROR:`, error.message, error.stack);
        if (!res.headersSent) { res.status(500).json({ error: 'Error del servidor.' }); }
    }
});


// --- PUT /api/citas/:citaId/cancelar-cliente - Cliente cancela su cita ---
router.put('/:citaId/cancelar-cliente', authenticateCliente, async (req, res) => {
    const { citaId } = req.params;
    const clienteIdAutenticado = req.user?.userId;

    console.log(`BACKEND PUT /citas/${citaId}/cancelar-cliente: INICIO - Cliente ID ${clienteIdAutenticado} intenta cancelar.`);

    if (!clienteIdAutenticado) { // Este check es redundante si authenticateCliente ya retorna error, pero por si acaso.
        return res.status(401).json({ error: 'No autenticado para esta acción.' });
    }
    if (!citaId || isNaN(parseInt(citaId))) {
        return res.status(400).json({ error: 'ID de cita no válido.' });
    }

    const nuevoEstado = 'Cancelada_cliente';

    try {
        console.log(`BACKEND PUT /citas/${citaId}/cancelar-cliente: Verificando propietario y estado actual.`);
        const citaResult = await pool.query(
            'SELECT usuario_id, estado_de_cita FROM citas WHERE id = $1',
            [citaId]
        );
        if (citaResult.rows.length === 0) {
            console.warn(`BACKEND PUT /citas/${citaId}/cancelar-cliente: Cita no encontrada.`);
            return res.status(404).json({ error: 'Cita no encontrada.' });
        }
        const cita = citaResult.rows[0];

        if (cita.usuario_id !== clienteIdAutenticado) {
            console.warn(`BACKEND PUT /citas/${citaId}/cancelar-cliente: Intento de cancelación por usuario no propietario. Dueño: ${cita.usuario_id}, Solicitante: ${clienteIdAutenticado}`);
            return res.status(403).json({ error: 'No tienes permiso para cancelar esta cita.' });
        }

        const estadosCancelablesPorCliente = ['Pendiente', 'Aceptada'];
        if (!estadosCancelablesPorCliente.map(s => s.toLowerCase()).includes(cita.estado_de_cita.toLowerCase())) {
            console.warn(`BACKEND PUT /citas/${citaId}/cancelar-cliente: Intento de cancelar cita en estado no permitido: ${cita.estado_de_cita}`);
            return res.status(400).json({ error: `No puedes cancelar una cita que está '${cita.estado_de_cita}'.` });
        }

        console.log(`BACKEND PUT /citas/${citaId}/cancelar-cliente: Actualizando estado_de_cita a '${nuevoEstado}'.`);
        const updateResult = await pool.query(
            'UPDATE citas SET estado_de_cita = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
            [nuevoEstado, citaId]
        );
        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada durante la actualización.' }); // No debería pasar
        }

        const detalleCitaQuery = ` /* ... Misma query de GET /:citaId ... */
            SELECT
                c.id, c.fecha, c.hora, c.estado_de_cita, c.notas_cliente,
                c.monto_total AS precio_total,
                u_cliente.name AS nombre_cliente,
                u_cliente.avatar AS avatar_cliente,
                (SELECT SUM(s.duracion_estimada_minutos) FROM cita_servicios cs_d JOIN servicios s ON s.id = cs_d.servicio_id WHERE cs_d.cita_id = c.id) AS duracion_total_estimada,
                ARRAY_AGG(s_n.nombre) AS servicios_nombres
            FROM citas c
            JOIN users u_cliente ON c.usuario_id = u_cliente.id
            LEFT JOIN cita_servicios cs_s ON cs_s.cita_id = c.id
            LEFT JOIN servicios s_n ON s_n.id = cs_s.servicio_id
            WHERE c.id = $1
            GROUP BY c.id, u_cliente.name, u_cliente.avatar;
        `;
        const citaActualizadaResult = await pool.query(detalleCitaQuery, [citaId]);

        console.log(`BACKEND PUT /citas/${citaId}/cancelar-cliente: Estado actualizado. A punto de enviar respuesta.`);
        res.json({ message: 'Cita cancelada exitosamente.', cita: citaActualizadaResult.rows[0] });
        console.log(`BACKEND PUT /citas/${citaId}/cancelar-cliente: Respuesta enviada.`);

    } catch (error) {
        console.error(`BACKEND PUT /citas/${citaId}/cancelar-cliente: ERROR:`, error.message, error.stack);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error del servidor al cancelar la cita.' });
        }
    }
});

module.exports = router;