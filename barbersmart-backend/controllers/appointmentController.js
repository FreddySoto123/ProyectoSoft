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
    usuario_id,
    barberia_id,
    barbero_id, // ID de la tabla 'barberos'
    fecha,
    hora,
    servicios,
    monto_total,
    notas_cliente,
  } = req.body;
  console.log('BACKEND: Creando nueva cita con datos:', req.body);

  if (!usuario_id) {
    return res.status(400).json({error: 'Falta el ID del usuario cliente.'});
  }
  if (
    !barberia_id ||
    !barbero_id ||
    !fecha ||
    !hora ||
    !servicios ||
    !Array.isArray(servicios) ||
    servicios.length === 0 ||
    monto_total === undefined ||
    typeof monto_total !== 'number'
  ) {
    return res
      .status(400)
      .json({error: 'Faltan datos requeridos o tienen formato incorrecto.'});
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const citaQuery = `
      INSERT INTO citas (usuario_id, barberia_id, barbero_id, fecha, hora, monto_total, estado_de_cita, estado_pago, notas_cliente)
      VALUES ($1, $2, $3, $4, $5, $6, 'Pendiente', 'Pendiente', $7)
      RETURNING *;
    `;
    const citaResult = await client.query(citaQuery, [
      usuario_id,
      barberia_id,
      barbero_id,
      fecha,
      hora,
      monto_total,
      notas_cliente || null,
    ]);
    const nuevaCita = citaResult.rows[0];
    console.log('BACKEND: Cita creada:', nuevaCita);

    const citaId = nuevaCita.id;
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
    res
      .status(500)
      .json({
        error: 'Error del servidor al crear la cita.',
        details: error.message,
      });
  } finally {
    client.release();
  }
};

// --- BARBERO ACTUALIZA ESTADO DE LA CITA ---
const updateAppointmentStatusByBarber = async (req, res) => {
  const {citaId} = req.params;
  const {nuevo_estado_cita} = req.body;
  const barberoAutenticadoUsuarioId = req.user?.id;

  if (!barberoAutenticadoUsuarioId) {
    return res.status(401).json({error: 'Barbero no autenticado.'});
  }
  if (
    !['Aceptada', 'Rechazada', 'Completada', 'Cancelada_Barbero'].includes(
      nuevo_estado_cita,
    )
  ) {
    return res.status(400).json({error: 'Estado de cita inválido.'});
  }
  console.log(
    `BACKEND: Barbero (usuario ID ${barberoAutenticadoUsuarioId}) actualizando cita ${citaId} a ${nuevo_estado_cita}`,
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const citaCheckQuery = `
        SELECT b.usuario_id AS barbero_usuario_id_en_cita
        FROM citas c
        JOIN barberos b ON c.barbero_id = b.id 
        WHERE c.id = $1;
    `;
    const citaCheckResult = await client.query(citaCheckQuery, [citaId]);

    if (citaCheckResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({error: 'Cita no encontrada.'});
    }
    if (
      String(citaCheckResult.rows[0].barbero_usuario_id_en_cita) !==
      String(barberoAutenticadoUsuarioId)
    ) {
      await client.query('ROLLBACK');
      return res
        .status(403)
        .json({error: 'No autorizado para modificar esta cita.'});
    }

    const result = await client.query(
      'UPDATE citas SET estado_de_cita = $1, updated_at = NOW() WHERE id = $2 RETURNING *;',
      [nuevo_estado_cita, citaId],
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res
        .status(404)
        .json({error: 'Cita no encontrada para actualizar.'});
    }
    await client.query('COMMIT');
    res.json({
      message: `Cita ${nuevo_estado_cita.toLowerCase()}.`,
      appointment: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      'BACKEND updateAppointmentStatusByBarber CATCH:',
      error.message,
      error.stack,
    );
    res
      .status(500)
      .json({
        error: 'Error al actualizar estado de la cita.',
        details: error.message,
      });
  } finally {
    client.release();
  }
};

// --- CLIENTE OBTIENE URL DE PAGO DE LIBÉLULA ---
const getLibelulaPaymentUrlForAppointment = async (req, res) => {
  const {citaId} = req.params;
  const {ci_cliente_form, nit_cliente_form} = req.body;

  if (!LIBELULA_API_KEY || !YOUR_APP_PUBLIC_URL) {
    return res.status(500).json({error: 'Servicio de pagos no configurado.'});
  }
  if (!citaId) {
    return res.status(400).json({error: 'Falta el ID de la cita.'});
  }
  if (!(ci_cliente_form || nit_cliente_form)) {
    return res.status(400).json({error: 'Se requiere CI o NIT para el pago.'});
  }

  console.log(`BACKEND: Solicitando URL de pago para cita ID: ${citaId}`);
  console.log(
    `BACKEND: Datos del formulario recibidos: CI=${ci_cliente_form}, NIT=${nit_cliente_form}`,
  );

  try {
    const citaDetailsQuery = `
      SELECT c.id, c.usuario_id, c.monto_total, c.estado_de_cita, c.estado_pago,
             u.email AS email_cliente, u.name AS nombre_cliente, -- Nombre completo del usuario
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

    // Razón Social por defecto será el nombre completo del cliente/usuario
    const razon_social_para_libelula =
      cita.nombre_cliente || 'Consumidor Final';

    // Generar tu identificador de deuda único
    const tuIdentificadorDeuda = `CITA-${cita.id}-${Date.now()}`;

    const deudaPayload = {
      appkey: LIBELULA_API_KEY,
      email_cliente: cita.email_cliente,
      identificador_deuda: tuIdentificadorDeuda, // Enviar tu identificador
      descripcion: `Servicios de Barbería - Cita #${cita.id}`,
      callback_url: `${YOUR_APP_PUBLIC_URL}/api/appointments/libelula-callback`,
      url_retorno: `barbersmartapp://payment/status`,
      nombre_cliente: nombre_cliente_lib,
      apellido_cliente: apellido_cliente_lib,
      ci: ci_cliente_form ? ci_cliente_form.trim() : '0000000',
      nit: nit_cliente_form
        ? nit_cliente_form.trim()
        : ci_cliente_form
        ? ci_cliente_form.trim()
        : '0000000',
      razon_social: razon_social_para_libelula, // Usar nombre del cliente como razón social
      emite_factura: true,
      moneda: 'BOB',
      lineas_detalle_deuda: cita.lineas_detalle_obj.map(s => ({
        ...s,
        costo_unitario: Number(s.costo_unitario),
      })),
    };

    console.log(
      'BACKEND: Payload para Libélula:',
      JSON.stringify(deudaPayload, null, 2).substring(0, 1000) + '...',
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
        libelulaResponse.data; // id_transaccion es el ID DE LIBÉLULA

      console.log(
        `BACKEND: Deuda registrada en Libélula. Su ID de transacción: ${id_transaccion}. Tu identificador_deuda: ${tuIdentificadorDeuda}`,
      );

      await pool.query(
        'UPDATE citas SET libelula_transaction_id = $1, libelula_payment_url = $2, libelula_qr_url = $3, libelula_identificador_deuda = $4, updated_at = NOW() WHERE id = $5',
        [
          id_transaccion,
          url_pasarela_pagos,
          qr_simple_url || null,
          tuIdentificadorDeuda,
          cita.id,
        ],
      );
      console.log(
        `BACKEND: Cita ${cita.id} actualizada con ID de Libélula: ${id_transaccion} y tu ID: ${tuIdentificadorDeuda}`,
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
  // El transaction_id en el callback de Libélula es TU identificador_deuda
  const tuIdentificadorDeudaRecibido =
    callbackData.id_transaccion || callbackData.transaction_id;

  console.log(
    `>>>>>>>>>>>>>> BACKEND: LIBELULA CALLBACK para TU identificador_deuda: ${tuIdentificadorDeudaRecibido} <<<<<<<<<<<<<<`,
  );
  console.log(
    'BACKEND: Datos completos del callback de Libélula:',
    JSON.stringify(callbackData, null, 2),
  );

  if (!tuIdentificadorDeudaRecibido) {
    console.error(
      'BACKEND LIBELULA CB: No se recibió id_transaccion (tu identificador_deuda).',
    );
    return res.status(400).send('Falta id_transaccion');
  }

  try {
    const pagoExitoso = callbackData.error === '0' || callbackData.error === 0;
    let nuevoEstadoPago = 'Pendiente';
    let metodoPagoConfirmado = null;
    let invoiceUrlFromCallback = null;

    if (pagoExitoso) {
      nuevoEstadoPago = 'Pagado';
      metodoPagoConfirmado = callbackData.forma_pago || 'Libelula Confirmado';
      console.log(
        `BACKEND LIBELULA CB: Pago exitoso para ${tuIdentificadorDeudaRecibido}. Método: ${metodoPagoConfirmado}`,
      );

      if (
        callbackData.facturas_electronicas &&
        callbackData.facturas_electronicas.length > 0
      ) {
        invoiceUrlFromCallback =
          callbackData.facturas_electronicas[0]?.url || null;
      } else if (callbackData.invoice_url) {
        invoiceUrlFromCallback = callbackData.invoice_url;
      }
      if (invoiceUrlFromCallback)
        console.log(
          `BACKEND LIBELULA CB: URL de factura recibida: ${invoiceUrlFromCallback}`,
        );
      else
        console.log(
          `BACKEND LIBELULA CB: No se recibió URL de factura para ${tuIdentificadorDeudaRecibido}.`,
        );
    } else {
      nuevoEstadoPago = 'Fallido';
      console.log(
        `BACKEND LIBELULA CB: Pago no exitoso para ${tuIdentificadorDeudaRecibido}. Data:`,
        callbackData,
      );
    }

    let updateQuery = `
      UPDATE citas
      SET estado_pago = $1, metodo_pago = $2, fecha_pago_confirmado = $3`;
    const queryParams = [
      nuevoEstadoPago,
      metodoPagoConfirmado,
      nuevoEstadoPago === 'Pagado' ? new Date() : null,
    ];
    let paramIndex = 4;

    if (pagoExitoso && invoiceUrlFromCallback) {
      updateQuery += `, libelula_invoice_url = $${paramIndex}`;
      queryParams.push(invoiceUrlFromCallback);
      paramIndex++;
    }

    updateQuery += `, updated_at = NOW()
      WHERE libelula_identificador_deuda = $${paramIndex} AND estado_pago != 'Pagado' -- BUSCAR POR TU IDENTIFICADOR
      RETURNING id, estado_pago, libelula_invoice_url;`;
    queryParams.push(tuIdentificadorDeudaRecibido);

    console.log('BACKEND LIBELULA CB: Update Query:', updateQuery);
    console.log('BACKEND LIBELULA CB: Query Params:', queryParams);

    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length > 0) {
      console.log(
        `BACKEND LIBELULA CB: Cita ${
          result.rows[0].id
        } actualizada. Estado Pago: ${
          result.rows[0].estado_pago
        }. Invoice URL: ${result.rows[0].libelula_invoice_url || 'N/A'}`,
      );
    } else {
      console.warn(
        `BACKEND LIBELULA CB: No se encontró/actualizó cita con TU identificador_deuda ${tuIdentificadorDeudaRecibido}.`,
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
  if (!userId) return res.status(400).json({error: 'Falta el ID del usuario.'});
  console.log(`BACKEND: Obteniendo citas para cliente usuario ID: ${userId}`);

  try {
    const query = `
      SELECT
        c.id, c.usuario_id, c.fecha, c.hora, c.monto_total, c.estado_de_cita, c.estado_pago, c.metodo_pago,
        c.libelula_transaction_id,       -- ID de transacción de Libélula
        c.libelula_identificador_deuda,  -- Tu ID de deuda enviado a Libélula
        c.libelula_payment_url, 
        c.libelula_qr_url,       
        c.libelula_invoice_url, 
        b_s.nombre AS nombre_barberia,
        u_b.name AS nombre_barbero,   
        u_b.avatar AS avatar_barbero,
        (SELECT STRING_AGG(s.nombre, ', ')
           FROM cita_servicios cs
           JOIN servicios s ON cs.servicio_id = s.id
           WHERE cs.cita_id = c.id) AS servicios_nombres
      FROM citas c
      JOIN barberias b_s ON c.barberia_id = b_s.id 
      JOIN barberos b_ent ON c.barbero_id = b_ent.id 
      JOIN users u_b ON b_ent.usuario_id = u_b.id   
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
        qr_para_pago: cita.libelula_qr_url,
      })),
    );
  } catch (error) {
    console.error(
      'BACKEND getUserAppointments CATCH:',
      error.message,
      error.stack,
    );
    res
      .status(500)
      .json({
        error: 'Error del servidor al obtener las citas del usuario.',
        details: error.message,
      });
  }
};

// --- OBTENER CITAS DE UN BARBERO ---
const getBarberAppointments = async (req, res) => {
  const {barberUserId} = req.params;
  if (!barberUserId)
    return res.status(400).json({error: 'Falta el ID del barbero.'});
  console.log(
    `BACKEND: Obteniendo citas para barbero (usuario ID): ${barberUserId}`,
  );
  try {
    const query = `
      SELECT
        c.id, c.fecha, c.hora, c.monto_total, c.estado_de_cita, c.estado_pago, c.metodo_pago,
        c.libelula_invoice_url, 
        bs.nombre AS nombre_barberia,
        u_cliente.name AS nombre_cliente,
        (SELECT STRING_AGG(s.nombre, ', ')
           FROM cita_servicios cs
           JOIN servicios s ON cs.servicio_id = s.id
           WHERE cs.cita_id = c.id) AS servicios_nombres
      FROM citas c
      JOIN barberias bs ON c.barberia_id = bs.id
      JOIN users u_cliente ON c.usuario_id = u_cliente.id
      JOIN barberos b_entidad ON c.barbero_id = b_entidad.id
      WHERE b_entidad.usuario_id = $1 
      ORDER BY c.fecha ASC, c.hora ASC;
    `;
    const result = await pool.query(query, [barberUserId]);
    console.log(
      `BACKEND: Encontradas ${result.rows.length} citas para el barbero ${barberUserId}.`,
    );
    res.json(result.rows);
  } catch (error) {
    console.error(
      'BACKEND getBarberAppointments CATCH:',
      error.message,
      error.stack,
    );
    res
      .status(500)
      .json({
        error: 'Error del servidor al obtener las citas del barbero.',
        details: error.message,
      });
  }
};

// --- BARBERO CONFIRMA PAGO MANUAL ---
const confirmManualPaymentByBarber = async (req, res) => {
  const {citaId} = req.params;
  const {metodo_pago} = req.body;
  const barberoAutenticadoUsuarioId = req.user?.id;

  if (!barberoAutenticadoUsuarioId)
    return res.status(401).json({error: 'Barbero no autenticado.'});
  if (!metodo_pago)
    return res.status(400).json({error: 'Método de pago es requerido.'});
  console.log(
    `BACKEND: Barbero (usuario ID ${barberoAutenticadoUsuarioId}) confirmando pago manual para cita ${citaId} con método ${metodo_pago}`,
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const citaCheckQuery = `
        SELECT b.usuario_id AS barbero_usuario_id_en_cita
        FROM citas c
        JOIN barberos b ON c.barbero_id = b.id
        WHERE c.id = $1;
    `;
    const citaCheckResult = await client.query(citaCheckQuery, [citaId]);

    if (citaCheckResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({error: 'Cita no encontrada.'});
    }
    if (
      String(citaCheckResult.rows[0].barbero_usuario_id_en_cita) !==
      String(barberoAutenticadoUsuarioId)
    ) {
      await client.query('ROLLBACK');
      return res.status(403).json({error: 'No autorizado.'});
    }

    const result = await client.query(
      `UPDATE citas SET estado_pago = 'Pagado', metodo_pago = $1, fecha_pago_confirmado = NOW(), updated_at = NOW()
       WHERE id = $2 AND estado_pago = 'Pendiente' RETURNING *;`,
      [metodo_pago, citaId],
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res
        .status(409)
        .json({
          error: 'No se pudo actualizar el pago (ya pagada o no encontrada).',
        });
    }
    await client.query('COMMIT');
    res.json({
      message: 'Pago confirmado manualmente.',
      appointment: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      'BACKEND confirmManualPaymentByBarber CATCH:',
      error.message,
      error.stack,
    );
    res
      .status(500)
      .json({error: 'Error al confirmar pago manual.', details: error.message});
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
