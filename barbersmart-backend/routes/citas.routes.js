// backend/routes/citas.routes.js
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
    monto_total,
  } = req.body;

  console.log('>>> BACKEND POST /citas: Datos recibidos para crear cita:', req.body);

  if (
    !usuario_id || !barberia_id || !barbero_id ||
    !servicios_id || !Array.isArray(servicios_id) || servicios_id.length === 0 ||
    !fecha || !hora
  ) {
    console.warn('BACKEND POST /citas: Datos incompletos o incorrectos:', req.body);
    return res.status(400).json({ error: 'Faltan datos obligatorios o servicios inválidos.' });
  }

  const montoTotalNumerico = monto_total !== undefined ? parseFloat(monto_total) : null;
  if (monto_total !== undefined && (isNaN(montoTotalNumerico) || montoTotalNumerico < 0)) {
      console.warn('BACKEND POST /citas: Monto total inválido:', monto_total);
      return res.status(400).json({ error: 'Monto total inválido.' });
  }

  try {
    const insertCitaQuery = `
      INSERT INTO citas (usuario_id, barberia_id, barbero_id, fecha, hora, monto_total)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    const values = [usuario_id, barberia_id, barbero_id, fecha, hora, montoTotalNumerico];
    const result = await pool.query(insertCitaQuery, values);
    const citaId = result.rows[0].id;
    console.log(`BACKEND POST /citas: Cita creada con ID: ${citaId}`);

    const insertServicioQuery = `
      INSERT INTO cita_servicios (cita_id, servicio_id) VALUES ($1, $2);
    `;
    for (const servicioId of servicios_id) {
      await pool.query(insertServicioQuery, [citaId, servicioId]);
    }
    console.log('BACKEND POST /citas: Todos los servicios asociados a la cita insertados correctamente.');

    const detalleCitaQuery = `
        SELECT
            c.id, c.fecha, c.hora, c.estado_de_cita,
            c.monto_total AS precio_total,
            u_cliente.name AS nombre_cliente,
            u_cliente.avatar AS avatar_cliente,
            (SELECT SUM(s.duracion_estimada_minutos) FROM cita_servicios cs_dur JOIN servicios s ON s.id = cs_dur.servicio_id WHERE cs_dur.cita_id = c.id) AS duracion_total_estimada,
            ARRAY_AGG(s.nombre) AS servicios_nombres
        FROM citas c
        JOIN users u_cliente ON c.usuario_id = u_cliente.id
        LEFT JOIN cita_servicios cs ON cs.cita_id = c.id
        LEFT JOIN servicios s ON s.id = cs.servicio_id
        WHERE c.id = $1
        GROUP BY c.id, u_cliente.name, u_cliente.avatar;
    `;
    const nuevaCitaResult = await pool.query(detalleCitaQuery, [citaId]);
    res.status(201).json({ message: 'Cita creada correctamente.', cita: nuevaCitaResult.rows[0] });
  } catch (error) {
    console.error('BACKEND POST /citas: Error creando cita:', error);
    res.status(500).json({ error: error.message || 'Error del servidor al crear la cita.' });
  }
});

// GET /api/citas/user/:userId - Obtener citas por usuario (CLIENTE)
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log(`BACKEND GET /citas/user/${userId}: Consultando citas para el cliente.`);
  try {
    const query = `
      SELECT
        c.id, c.fecha, c.hora, c.estado_de_cita, c.monto_total AS precio_total,
        b_info.nombre AS nombre_barberia,
        u_barbero.name AS nombre_barbero,
        ARRAY_AGG(s.nombre) AS servicios
      FROM citas c
      JOIN barberias b_info ON c.barberia_id = b_info.id
      JOIN barberos bar_profile ON c.barbero_id = bar_profile.id
      JOIN users u_barbero ON bar_profile.usuario_id = u_barbero.id
      LEFT JOIN cita_servicios cs ON cs.cita_id = c.id
      LEFT JOIN servicios s ON s.id = cs.servicio_id
      WHERE c.usuario_id = $1
      GROUP BY c.id, b_info.nombre, u_barbero.name
      ORDER BY c.fecha DESC, c.hora DESC;
    `;
    const result = await pool.query(query, [userId]);

    // --- LOGS AÑADIDOS PARA DEPURAR LA RESPUESTA ---
    console.log(`BACKEND GET /citas/user/${userId}: Citas encontradas (antes de enviar): ${result.rows.length}`);
    console.log(`BACKEND GET /citas/user/${userId}: Tipo de result.rows: ${typeof result.rows}, Es array?: ${Array.isArray(result.rows)}`);
    console.log(`BACKEND GET /citas/user/${userId}: Contenido de result.rows:`, JSON.stringify(result.rows, null, 2));
    // --- FIN DE LOGS AÑADIDOS ---

    res.json(result.rows);
  } catch (error) {
    console.error(`BACKEND GET /citas/user/${userId}: Error obteniendo citas del cliente:`, error.message, error.stack);
    res.status(500).json({ error: 'Error del servidor al obtener las citas del cliente.' });
  }
});


// --- ENDPOINT PARA CITAS DEL BARBERO ---
// (El resto de tus endpoints para /barber/:barberUserId, /:citaId, y /:citaId/estado se mantienen igual que en la versión anterior que te di)
// ... (código de GET /api/citas/barber/:barberUserId) ...
// ... (código de GET /api/citas/:citaId) ...
// ... (código de PUT /api/citas/:citaId/estado) ...
// Asegúrate de copiar el resto de tus rutas aquí si las tenías en el mismo archivo.
// Para mantener este bloque de código enfocado, solo he modificado el endpoint /user/:userId.
// Aquí pego el resto de las rutas como estaban en tu última versión completa para que no falten.

router.get('/barber/:barberUserId', async (req, res) => {
  const { barberUserId } = req.params;
  console.log(`BACKEND GET /citas/barber/${barberUserId}: INICIO - Consultando citas.`);

  if (!barberUserId || isNaN(parseInt(barberUserId))) {
    console.warn(`BACKEND GET /citas/barber/${barberUserId}: ID de barbero inválido.`);
    return res.status(400).json({ error: 'ID de barbero (usuario) inválido.' });
  }

  try {
    const query = `
      SELECT
        c.id,
        c.fecha,
        c.hora,
        c.estado_de_cita,
        c.monto_total AS precio_total,
        b_info.nombre AS nombre_barberia,
        u_cliente.name AS nombre_cliente,
        ARRAY_AGG(s.nombre) AS servicios_nombres
      FROM citas c
      JOIN barberias b_info ON c.barberia_id = b_info.id
      JOIN users u_cliente ON c.usuario_id = u_cliente.id
      JOIN barberos bar_profile ON c.barbero_id = bar_profile.id
      JOIN users u_barbero_profile ON bar_profile.usuario_id = u_barbero_profile.id
      LEFT JOIN cita_servicios cs ON cs.cita_id = c.id
      LEFT JOIN servicios s ON s.id = cs.servicio_id
      WHERE u_barbero_profile.id = $1
      GROUP BY c.id, b_info.nombre, u_cliente.name
      ORDER BY c.fecha ASC, c.hora ASC;
    `;
    console.log(`BACKEND GET /citas/barber/${barberUserId}: Ejecutando query.`);
    const result = await pool.query(query, [barberUserId]);

    console.log(`BACKEND GET /citas/barber/${barberUserId}: Query completada. Citas encontradas: ${result.rows.length}`);
    console.log(`BACKEND GET /citas/barber/${barberUserId}: Datos de citas:`, JSON.stringify(result.rows, null, 2));
    console.log(`BACKEND GET /citas/barber/${barberUserId}: A punto de enviar respuesta JSON.`);
    res.json(result.rows);
    console.log(`BACKEND GET /citas/barber/${barberUserId}: Respuesta JSON enviada.`);

  } catch (err) {
    console.error(`BACKEND GET /citas/barber/${barberUserId}: ERROR en el bloque catch:`, err.message);
    console.error(`BACKEND GET /citas/barber/${barberUserId}: Stack del error:`, err.stack);
    if (!res.headersSent) {
      console.log(`BACKEND GET /citas/barber/${barberUserId}: A punto de enviar respuesta de error 500.`);
      res.status(500).json({ error: 'Error interno del servidor al obtener citas del barbero.' });
      console.log(`BACKEND GET /citas/barber/${barberUserId}: Respuesta de error 500 enviada.`);
    } else {
      console.log(`BACKEND GET /citas/barber/${barberUserId}: Headers ya enviados, no se puede enviar error 500.`);
    }
  }
});

router.get('/:citaId', async (req, res) => {
    const { citaId } = req.params;
    console.log(`BACKEND GET /citas/${citaId}: INICIO - Obteniendo detalle.`);
    try {
        const query = `
            SELECT
                c.id,
                c.fecha,
                c.hora,
                c.estado_de_cita,
                c.monto_total AS precio_total,
                u_cliente.name AS nombre_cliente,
                u_cliente.avatar AS avatar_cliente,
                (SELECT SUM(s.duracion_estimada_minutos)
                 FROM cita_servicios cs_dur
                 JOIN servicios s ON s.id = cs_dur.servicio_id
                 WHERE cs_dur.cita_id = c.id) AS duracion_total_estimada,
                ARRAY_AGG(s.nombre) AS servicios_nombres
            FROM citas c
            JOIN users u_cliente ON c.usuario_id = u_cliente.id
            LEFT JOIN cita_servicios cs ON cs.cita_id = c.id
            LEFT JOIN servicios s ON s.id = cs.servicio_id
            WHERE c.id = $1
            GROUP BY c.id, u_cliente.name, u_cliente.avatar;
        `;
        console.log(`BACKEND GET /citas/${citaId}: Ejecutando query.`);
        const result = await pool.query(query, [citaId]);

        if (result.rows.length === 0) {
            console.warn(`BACKEND GET /citas/${citaId}: Cita no encontrada.`);
            return res.status(404).json({ error: 'Cita no encontrada.' });
        }
        console.log(`BACKEND GET /citas/${citaId}: Detalle encontrado:`, JSON.stringify(result.rows[0], null, 2));
        console.log(`BACKEND GET /citas/${citaId}: A punto de enviar respuesta JSON.`);
        res.json(result.rows[0]);
        console.log(`BACKEND GET /citas/${citaId}: Respuesta JSON enviada.`);

    } catch (error) {
        console.error(`BACKEND GET /citas/${citaId}: ERROR:`, error.message, error.stack);
        if (!res.headersSent) {
            console.log(`BACKEND GET /citas/${citaId}: A punto de enviar respuesta de error 500.`);
            res.status(500).json({ error: 'Error del servidor al obtener detalle de cita.' });
            console.log(`BACKEND GET /citas/${citaId}: Respuesta de error 500 enviada.`);
        }
    }
});

router.put('/:citaId/estado', async (req, res) => {
    const { citaId } = req.params;
    const { nuevoEstado } = req.body;
    console.log(`BACKEND PUT /citas/${citaId}/estado: INICIO - Solicitud para cambiar a: ${nuevoEstado}`);

    let nuevoValorBooleano;
    if (nuevoEstado === 'aceptada') {
        nuevoValorBooleano = true;
    } else if (nuevoEstado === 'rechazada') {
        nuevoValorBooleano = false;
        console.log(`BACKEND PUT /citas/${citaId}/estado: Acción '${nuevoEstado}' recibida. Se establecerá estado_de_cita a FALSE.`);
    } else {
        console.warn(`BACKEND PUT /citas/${citaId}/estado: Estado no válido proporcionado: ${nuevoEstado}`);
        return res.status(400).json({ error: 'El valor para nuevoEstado no es válido.' });
    }

    if (typeof nuevoValorBooleano !== 'undefined') {
        try {
            console.log(`BACKEND PUT /citas/${citaId}/estado: Actualizando estado_de_cita a ${nuevoValorBooleano}.`);
            // Solo actualizamos estado_de_cita y updated_at
            const updateQuery = 'UPDATE citas SET estado_de_cita = $1, updated_at = NOW() WHERE id = $2 RETURNING id;';
            const updateResult = await pool.query(updateQuery, [nuevoValorBooleano, citaId]);

            if (updateResult.rows.length === 0) {
                console.warn(`BACKEND PUT /citas/${citaId}/estado: Cita no encontrada para actualizar.`);
                return res.status(404).json({ error: 'Cita no encontrada o no se pudo actualizar.' });
            }

            // Volver a consultar el detalle completo para devolverlo
            const detalleCitaQuery = `
                SELECT
                    c.id, c.fecha, c.hora, c.estado_de_cita,
                    c.monto_total AS precio_total,
                    u_cliente.name AS nombre_cliente,
                    u_cliente.avatar AS avatar_cliente,
                    (SELECT SUM(s.duracion_estimada_minutos) FROM cita_servicios cs_dur JOIN servicios s ON s.id = cs_dur.servicio_id WHERE cs_dur.cita_id = c.id) AS duracion_total_estimada,
                    ARRAY_AGG(s.nombre) AS servicios_nombres
                FROM citas c
                JOIN users u_cliente ON c.usuario_id = u_cliente.id
                LEFT JOIN cita_servicios cs ON cs.cita_id = c.id
                LEFT JOIN servicios s ON s.id = cs.servicio_id
                WHERE c.id = $1
                GROUP BY c.id, u_cliente.name, u_cliente.avatar;
            `;
            const citaActualizadaResult = await pool.query(detalleCitaQuery, [citaId]);

            console.log(`BACKEND PUT /citas/${citaId}/estado: Estado actualizado exitosamente.`);
            res.json({
                message: `Estado de la cita actualizado a ${nuevoEstado}.`,
                cita: citaActualizadaResult.rows[0]
            });
        } catch (error) {
            console.error(`BACKEND PUT /citas/${citaId}/estado: ERROR actualizando:`, error.message, error.stack);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error del servidor al actualizar estado de la cita.' });
            }
        }
    }
});


module.exports = router;