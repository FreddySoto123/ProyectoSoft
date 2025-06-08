// controllers/appointmentController.js
const pool = require('../db');
const axios = require('axios'); // Para Libélula

const LIBELULA_API_KEY = process.env.LIBELULA_API_KEY;
const LIBELULA_BASE_URL =
  process.env.LIBELULA_API_URL || 'https://api.libelula.bo'; // URL de producción o pruebas
const YOUR_APP_PUBLIC_URL = process.env.YOUR_APP_PUBLIC_URL; // Ej: https://tu-app.vercel.app

// --- CREAR UNA NUEVA CITA ---
const createAppointment = async (req, res) => {
  const {
    usuario_id, // Este es el ID del usuario cliente
    barberia_id,
    barbero_id, // Este debe ser el usuario_id del barbero
    fecha,
    hora,
    servicios, // Array de IDs de servicios
    monto_total,
    notas_cliente,
  } = req.body;
  console.log('BACKEND: Creando nueva cita con datos:', req.body);

  // El usuario_id del cliente ya viene como 'usuario_id' en el body
  if (!usuario_id) {
    console.error(
      'BACKEND createAppointment: Falta usuario_id (del cliente) en la solicitud.',
    );
    return res
      .status(400)
      .json({error: 'Falta el ID del usuario cliente en la solicitud.'});
  }
  if (
    !barberia_id ||
    !barbero_id || // Asegúrate que este es el users.id del barbero
    !fecha ||
    !hora ||
    !servicios ||
    !Array.isArray(servicios) || // Verificar que servicios sea un array
    servicios.length === 0 ||
    monto_total === undefined || // Permitir monto_total 0 si es válido
    typeof monto_total !== 'number'
  ) {
    console.error(
      'BACKEND createAppointment: Faltan datos requeridos o tienen formato incorrecto.',
      req.body,
    );
    return res.status(400).json({
      error:
        'Faltan datos requeridos o tienen formato incorrecto para crear la cita.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const citaQuery = `
      INSERT INTO citas (usuario_id, barberia_id, barbero_id, fecha, hora, monto_total, estado_de_cita, estado_pago, notas_cliente)
      VALUES ($1, $2, $3, $4, $5, $6, 'Pendiente', 'Pendiente', $7)
      RETURNING *;
    `;
    // Usar el usuario_id del cliente y el usuario_id del barbero
    const citaResult = await client.query(citaQuery, [
      usuario_id, // ID del usuario cliente
      barberia_id,
      barbero_id, // users.id del barbero
      fecha,
      hora,
      monto_total,
      notas_cliente || null,
    ]);
    const nuevaCita = citaResult.rows[0];
    console.log('BACKEND: Cita creada:', nuevaCita);

    const citaId = nuevaCita.id;
    // Asegurarse que servicios_id en la tabla cita_servicios sea el ID del servicio
    for (const servicio_id of servicios) {
      await client.query(
        'INSERT INTO cita_servicios (cita_id, servicio_id) VALUES ($1, $2);',
        [citaId, servicio_id],
      );
    }
    console.log('BACKEND: Servicios asociados a la cita insertados.');

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Cita creada exitosamente. Esperando aprobación del barbero.',
      appointment: nuevaCita,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      'BACKEND createAppointment CATCH:',
      error.message,
      error.stack,
    );
    res.status(500).json({
      error: 'Error del servidor al crear la cita.',
      details: error.message,
    });
  } finally {
    client.release();
  }
};

// --- BARBERO ACTUALIZA ESTADO DE LA CITA (Aceptada, Rechazada, Completada) ---
// Esta función ASUME que req.user.id existe y es el ID del barbero autenticado.
// Si no hay autenticación, esta lógica de protección no funcionará.
const updateAppointmentStatusByBarber = async (req, res) => {
  const {citaId} = req.params;
  const {nuevo_estado_cita} = req.body; // 'Aceptada', 'Rechazada', 'Completada', 'Cancelada_Barbero'

  // Si no hay sistema de autenticación, req.user será undefined.
  // Necesitarías pasar el ID del barbero de otra forma y validar su autenticidad,
  // o eliminar esta verificación si la lógica de negocio lo permite (no recomendado para acciones de barbero).
  // Por ahora, lo dejaré como si esperara req.user, pero ten en cuenta que fallará si no existe.
  const barberoAutenticadoId = req.user?.id;

  if (!barberoAutenticadoId) {
    // Esta verificación fallará si no hay autenticación configurada
    console.warn(
      'BACKEND updateAppointmentStatusByBarber: Intento de actualizar sin barbero autenticado (req.user.id no encontrado).',
    );
    return res.status(401).json({
      error: 'Barbero no autenticado. Esta acción requiere autenticación.',
    });
  }

  console.log(
    `BACKEND: Barbero ID ${barberoAutenticadoId} actualizando cita ID ${citaId} a estado: ${nuevo_estado_cita}`,
  );

  if (
    !nuevo_estado_cita ||
    !['Aceptada', 'Rechazada', 'Completada', 'Cancelada_Barbero'].includes(
      nuevo_estado_cita,
    )
  ) {
    return res
      .status(400)
      .json({error: 'Estado de cita inválido proporcionado.'});
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Verificar que la cita pertenece al barbero (usa el barbero_id almacenado en la cita, que debe ser el users.id del barbero)
    const citaCheckQuery = 'SELECT barbero_id FROM citas WHERE id = $1';
    const citaCheck = await client.query(citaCheckQuery, [citaId]);

    if (citaCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({error: 'Cita no encontrada.'});
    }
    // barbero_id en la tabla citas es el users.id del barbero
    if (String(citaCheck.rows[0].barbero_id) !== String(barberoAutenticadoId)) {
      await client.query('ROLLBACK');
      return res
        .status(403)
        .json({error: 'No autorizado para modificar esta cita.'});
    }

    const query = `UPDATE citas SET estado_de_cita = $1, updated_at = NOW() WHERE id = $2 RETURNING *;`;
    const result = await client.query(query, [nuevo_estado_cita, citaId]);

    if (result.rows.length === 0) {
      // Por si acaso, aunque la verificación anterior debería cubrirlo
      await client.query('ROLLBACK');
      return res
        .status(404)
        .json({error: 'Cita no encontrada después de intentar actualizar.'});
    }
    const updatedCita = result.rows[0];

    await client.query('COMMIT');
    res.json({
      message: `Cita ${nuevo_estado_cita.toLowerCase()}.`,
      appointment: updatedCita,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      'BACKEND updateAppointmentStatusByBarber CATCH:',
      error.message,
      error.stack,
    );
    res.status(500).json({
      error: 'Error del servidor al actualizar estado de la cita.',
      details: error.message,
    });
  } finally {
    client.release();
  }
};

// --- CLIENTE OBTIENE URL DE PAGO DE LIBÉLULA PARA UNA CITA ACEPTADA (SIN AUTENTICACIÓN DIRECTA EN ESTE ENDPOINT) ---
const getLibelulaPaymentUrlForAppointment = async (req, res) => {
  const {citaId} = req.params; // ID de la cita desde la URL
  // MODIFICADO: Ya no esperamos razon_social_form del body
  const {ci_cliente_form, nit_cliente_form} = req.body; // Datos del formulario del cliente

  if (!LIBELULA_API_KEY || !YOUR_APP_PUBLIC_URL) {
    // ... (manejo de error igual)
    return res.status(500).json({error: 'Servicio de pagos no configurado.'});
  }
  if (!citaId) {
    return res.status(400).json({error: 'Falta el ID de la cita.'});
  }

  // MODIFICADO: Solo validamos CI o NIT
  if (!(ci_cliente_form || nit_cliente_form)) {
    console.error(
      'BACKEND: getLibelulaPaymentUrlForAppointment - Faltan datos del formulario: CI/NIT.',
    );
    return res.status(400).json({error: 'Se requiere CI o NIT para el pago.'});
  }

  console.log(`BACKEND: Solicitando URL de pago para cita ID: ${citaId}`);
  console.log(
    `BACKEND: Datos del formulario recibidos: CI=${ci_cliente_form}, NIT=${nit_cliente_form}`,
  );

  try {
    const citaDetailsQuery = `
      SELECT c.id, c.usuario_id, c.monto_total, c.estado_de_cita, c.estado_pago,
             u.email AS email_cliente, u.name AS nombre_cliente,
             (SELECT COALESCE(ARRAY_AGG(json_build_object('concepto', s.nombre, 'cantidad', 1, 'costo_unitario', s.precio, 'codigo_producto', s.id::text)), '{}')
              FROM cita_servicios cs JOIN servicios s ON cs.servicio_id = s.id WHERE cs.cita_id = c.id) AS lineas_detalle_obj
      FROM citas c
      JOIN users u ON c.usuario_id = u.id
      WHERE c.id = $1;
    `;
    const citaResult = await pool.query(citaDetailsQuery, [citaId]);

    if (citaResult.rows.length === 0) {
      return res.status(404).json({error: 'Cita no encontrada.'});
    }
    const cita = citaResult.rows[0];

    if (cita.estado_de_cita !== 'Aceptada') {
      return res
        .status(400)
        .json({error: 'Esta cita aún no ha sido aceptada.'});
    }
    if (cita.estado_pago === 'Pagado') {
      return res.status(400).json({error: 'Esta cita ya fue pagada.'});
    }

    const nombres = cita.nombre_cliente.split(' ');
    const nombre_cliente_lib = nombres.slice(0, -1).join(' ') || nombres[0];
    const apellido_cliente_lib =
      nombres.length > 1 ? nombres[nombres.length - 1] : '';

    // MODIFICADO: Razón Social por defecto
    const razon_social_defecto = 'Servicios de Barbería'; // O "Corte de Cabello", etc.

    const deudaPayload = {
      appkey: LIBELULA_API_KEY,
      email_cliente: cita.email_cliente,
      identificador_deuda: `CITA-${cita.id}-${Date.now()}`,
      descripcion: `Servicios de Barbería - Cita #${cita.id}`,
      callback_url: `${YOUR_APP_PUBLIC_URL}/api/appointments/libelula-callback`,
      url_retorno: `barbersmartapp://payment/status`, // DEEP LINK para volver a tu app
      nombre_cliente: nombre_cliente_lib,
      apellido_cliente: apellido_cliente_lib,
      ci: ci_cliente_form ? ci_cliente_form.trim() : '0000000',
      nit: nit_cliente_form
        ? nit_cliente_form.trim()
        : ci_cliente_form
        ? ci_cliente_form.trim()
        : '0000000',
      razon_social: razon_social_defecto, // Usar el valor por defecto
      emite_factura: true,
      moneda: 'BOB',
      lineas_detalle_deuda: cita.lineas_detalle_obj.map(s => ({
        ...s,
        costo_unitario: Number(s.costo_unitario),
      })),
    };

    console.log(
      'BACKEND: Payload final para Libélula (parcial - identificador):',
      deudaPayload.identificador_deuda,
    );
    console.log(
      `BACKEND: Usando para Libélula -> CI: ${deudaPayload.ci}, NIT: ${deudaPayload.nit}, Razón Social: ${deudaPayload.razon_social}`,
    );

    const libelulaResponse = await axios.post(
      `${LIBELULA_BASE_URL}/rest/deuda/registrar`,
      deudaPayload,
    );

    if (
      libelulaResponse.data?.error === 0 ||
      (libelulaResponse.data?.error === '0' &&
        libelulaResponse.data.id_transaccion)
    ) {
      const {url_pasarela_pagos, id_transaccion, qr_simple_url} =
        libelulaResponse.data;
      await pool.query(
        'UPDATE citas SET libelula_transaction_id = $1, libelula_payment_url = $2, libelula_qr_url = $3, updated_at = NOW() WHERE id = $4',
        [id_transaccion, url_pasarela_pagos, qr_simple_url || null, cita.id],
      );
      res.json({
        paymentUrl: url_pasarela_pagos,
        transactionId: id_transaccion,
        qrUrl: qr_simple_url,
      });
    } else {
      console.error(
        'BACKEND: Error al registrar deuda en Libélula:',
        libelulaResponse.data,
      );
      const errorMessage =
        libelulaResponse.data?.mensaje ||
        (libelulaResponse.data?.descripcion_error
          ? `${libelulaResponse.data.descripcion_error} (Código: ${libelulaResponse.data.error})`
          : null) ||
        `Error al contactar la pasarela de pago (Status: ${libelulaResponse.status}).`;
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error(
      'BACKEND getLibelulaPaymentUrlForAppointment CATCH:',
      error.message,
      error.stack,
    );
    res
      .status(500)
      .json({
        error: 'Error del servidor al procesar el pago.',
        details: error.message,
      });
  }
};

// --- CALLBACK DE LIBÉLULA (Webhook) ---
const libelulaPaymentCallback = async (req, res) => {
  const callbackData = req.method === 'POST' ? req.body : req.query;
  const transaction_id =
    callbackData.id_transaccion || callbackData.transaction_id;

  console.log(
    `>>>>>>>>>>>>>> BACKEND: LIBELULA CALLBACK para transaction_id: ${transaction_id} <<<<<<<<<<<<<<`,
  );
  console.log(
    'BACKEND: Datos completos del callback de Libélula:',
    callbackData,
  );

  if (!transaction_id) {
    console.error('BACKEND LIBELULA CB: No se recibió id_transaccion.');
    return res.status(400).send('Falta id_transaccion');
  }

  // No usamos pool.connect() aquí porque solo es una query, pool.query() es suficiente y maneja la conexión.
  try {
    const pagoExitoso = callbackData.error === '0' || callbackData.error === 0;

    let nuevoEstadoPago = 'Pendiente';
    let metodoPagoConfirmado = null;

    if (pagoExitoso) {
      nuevoEstadoPago = 'Pagado';
      metodoPagoConfirmado = callbackData.forma_pago || 'Libelula_Confirmado';
      console.log(
        `BACKEND LIBELULA CB: Pago exitoso para ${transaction_id}. Método: ${metodoPagoConfirmado}`,
      );
    } else {
      nuevoEstadoPago = 'Fallido'; // O el estado que Libélula indique para un pago no exitoso
      console.log(
        `BACKEND LIBELULA CB: Pago no exitoso para ${transaction_id}. Data:`,
        callbackData,
      );
    }

    const updateQuery = `
      UPDATE citas
      SET estado_pago = $1, metodo_pago = $2, fecha_pago_confirmado = $3, updated_at = NOW()
      WHERE libelula_transaction_id = $4 AND estado_pago != 'Pagado'
      RETURNING id, estado_pago;
    `;
    const result = await pool.query(updateQuery, [
      nuevoEstadoPago,
      metodoPagoConfirmado,
      nuevoEstadoPago === 'Pagado' ? new Date() : null,
      transaction_id,
    ]);

    if (result.rows.length > 0) {
      console.log(
        `BACKEND LIBELULA CB: Cita ${result.rows[0].id} actualizada a estado_pago ${result.rows[0].estado_pago}`,
      );
    } else {
      console.warn(
        `BACKEND LIBELULA CB: No se encontró/actualizó cita con libelula_transaction_id ${transaction_id}. Pudo ya estar pagada o no existir.`,
      );
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error(
      'BACKEND libelulaPaymentCallback CATCH:',
      error.message,
      error.stack,
    );
    res.status(500).send('Error procesando callback');
  }
};

// --- OBTENER CITAS DE UN USUARIO (CLIENTE) ---
const getUserAppointments = async (req, res) => {
  const {userId} = req.params;
  if (!userId) {
    return res.status(400).json({error: 'Falta el ID del usuario.'});
  }
  console.log(`BACKEND: Obteniendo citas para cliente usuario ID: ${userId}`);

  try {
    const query = `
  SELECT
    c.id, c.usuario_id, c.fecha, c.hora, c.monto_total, c.estado_de_cita, c.estado_pago, c.metodo_pago,
    c.libelula_transaction_id, 
    c.libelula_payment_url,  -- URL de la pasarela de Libélula
    c.libelula_qr_url,       -- URL del QR específico de Libélula
    b.nombre AS nombre_barberia,
    u_barbero.name AS nombre_barbero,
    u_barbero.avatar AS avatar_barbero, -- Avatar del barbero, separado
    (SELECT STRING_AGG(s.nombre, ', ')
       FROM cita_servicios cs
       JOIN servicios s ON cs.servicio_id = s.id
       WHERE cs.cita_id = c.id) AS servicios_nombres
  FROM citas c
  JOIN barberias b ON c.barberia_id = b.id
  JOIN users u_barbero ON c.barbero_id = u_barbero.id
  WHERE c.usuario_id = $1
  ORDER BY c.fecha DESC, c.hora DESC;
`;
    const result = await pool.query(query, [userId]);

    console.log(
      `BACKEND: Encontradas ${result.rows.length} citas para el usuario ${userId}.`,
    );
    res.json(
      result.rows.map(cita => ({
        ...cita,
        // El frontend espera 'estado_de_cita', así que no se necesita alias aquí si el frontend se actualizó.
        // Si el frontend espera 'estado_cita', entonces aquí deberías hacer:
        // estado_cita: cita.estado_de_cita,
        // y quitar 'estado_de_cita' del spread si no quieres ambos.
        // Por consistencia con tu decisión de usar "estado_de_cita" en todos lados:
        estado_de_cita: cita.estado_de_cita,
        qr_para_pago: cita.libelula_qr_url, // Solo la URL del QR de Libélula
      })),
    );
  } catch (error) {
    console.error(
      'BACKEND getUserAppointments CATCH: Error al obtener citas para el usuario ID',
      userId,
      error.message,
      error.stack,
    );
    res.status(500).json({
      error: 'Error del servidor al obtener las citas del usuario.',
      details: error.message,
    });
  }
};

// --- OBTENER CITAS DE UN BARBERO ---
const getBarberAppointments = async (req, res) => {
  const {barberUserId} = req.params; // Este es el users.id del barbero
  if (!barberUserId) {
    return res.status(400).json({error: 'Falta el ID del usuario barbero.'});
  }
  console.log(
    `BACKEND: Obteniendo citas para barbero (usuario ID): ${barberUserId}`,
  );
  try {
    const query = `
      SELECT
        c.id, c.fecha, c.hora, c.monto_total, c.estado_de_cita, c.estado_pago, c.metodo_pago,
        b.nombre AS nombre_barberia,
        u_cliente.name AS nombre_cliente,
        (SELECT STRING_AGG(s.nombre, ', ')
           FROM cita_servicios cs
           JOIN servicios s ON cs.servicio_id = s.id
           WHERE cs.cita_id = c.id) AS servicios_nombres
      FROM citas c
      JOIN barberias b ON c.barberia_id = b.id
      JOIN users u_cliente ON c.usuario_id = u_cliente.id
      WHERE c.barbero_id = $1 -- c.barbero_id es el users.id del barbero
      ORDER BY c.fecha ASC, c.hora ASC;
    `;
    const result = await pool.query(query, [barberUserId]);
    console.log(
      `BACKEND: Encontradas ${result.rows.length} citas para el barbero ${barberUserId}.`,
    );
    // Similar a getUserAppointments, asegúrate que el frontend espere 'estado_de_cita'
    res.json(
      result.rows.map(cita => ({...cita, estado_de_cita: cita.estado_de_cita})),
    );
  } catch (error) {
    console.error(
      'BACKEND getBarberAppointments CATCH: Error al obtener citas para el barbero ID',
      barberUserId,
      error.message,
      error.stack,
    );
    res.status(500).json({
      error: 'Error del servidor al obtener las citas del barbero.',
      details: error.message,
    });
  }
};

// --- BARBERO CONFIRMA PAGO MANUAL ---
// Esta función ASUME que req.user.id existe y es el ID del barbero autenticado.
const confirmManualPaymentByBarber = async (req, res) => {
  const {citaId} = req.params;
  const {metodo_pago} = req.body;

  const barberoAutenticadoId = req.user?.id; // Fallará si no hay autenticación
  if (!barberoAutenticadoId) {
    console.warn(
      'BACKEND confirmManualPaymentByBarber: Intento de confirmar pago sin barbero autenticado.',
    );
    return res.status(401).json({
      error: 'Barbero no autenticado. Esta acción requiere autenticación.',
    });
  }
  if (!metodo_pago) {
    return res.status(400).json({error: 'Método de pago es requerido.'});
  }

  console.log(
    `BACKEND: Barbero ID ${barberoAutenticadoId} confirmando pago manual para cita ID ${citaId} con método ${metodo_pago}`,
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const citaCheck = await client.query(
      'SELECT barbero_id, estado_de_cita FROM citas WHERE id = $1', // Usar estado_de_cita
      [citaId],
    );
    if (citaCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({error: 'Cita no encontrada.'});
    }
    if (String(citaCheck.rows[0].barbero_id) !== String(barberoAutenticadoId)) {
      await client.query('ROLLBACK');
      return res
        .status(403)
        .json({error: 'No autorizado para modificar esta cita.'});
    }

    const query = `
      UPDATE citas
      SET estado_pago = 'Pagado', metodo_pago = $1, fecha_pago_confirmado = NOW(), updated_at = NOW()
      WHERE id = $2 AND estado_pago = 'Pendiente'
      RETURNING *;
    `;
    const result = await pool.query(query, [metodo_pago, citaId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error:
          'No se pudo actualizar el pago. Verifica el estado actual de la cita (podría ya estar pagada o no existir).',
      });
    }
    await client.query('COMMIT');
    res.json({
      message: `Pago de la cita confirmado manualmente.`,
      appointment: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      'BACKEND confirmManualPaymentByBarber CATCH:',
      error.message,
      error.stack,
    );
    res.status(500).json({
      error: 'Error del servidor al confirmar pago manual.',
      details: error.message,
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createAppointment,
  getUserAppointments,
  getBarberAppointments,
  updateAppointmentStatusByBarber,
  getLibelulaPaymentUrlForAppointment,
  libelulaPaymentCallback,
  confirmManualPaymentByBarber,
};
