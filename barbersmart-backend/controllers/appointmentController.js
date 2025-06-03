// controllers/appointmentController.js
const pool = require('../db');
// Asumiremos que tienes una función para generar QR o una URL base para QR
const QR_CODE_BASE_URL =
  process.env.QR_CODE_BASE_URL ||
  'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='; // Ejemplo

// --- CREAR UNA NUEVA CITA ---
const createAppointment = async (req, res) => {
  // usuario_id (cliente), barberia_id, barbero_id, fecha, hora, servicios (array de servicio_id), monto_total
  const {
    usuario_id,
    barberia_id,
    barbero_id,
    fecha,
    hora,
    servicios, // Array de IDs de servicios, ej: [1, 3]
    monto_total,
    notas_cliente, // Opcional
  } = req.body;

  console.log('BACKEND: Creando nueva cita con datos:', req.body);

  if (
    !usuario_id ||
    !barberia_id ||
    !barbero_id ||
    !fecha ||
    !hora ||
    !servicios ||
    servicios.length === 0 ||
    monto_total === undefined
  ) {
    return res
      .status(400)
      .json({error: 'Faltan datos requeridos para crear la cita.'});
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Iniciar transacción

    // 1. Insertar en la tabla 'citas'
    const citaQuery = `
      INSERT INTO citas (usuario_id, barberia_id, barbero_id, fecha, hora, monto_total, estado_pago, metodo_pago, notas_cliente)
      VALUES ($1, $2, $3, $4, $5, $6, 'Pendiente', NULL, $7) 
      RETURNING id, usuario_id, barberia_id, barbero_id, fecha, hora, monto_total, estado_pago;
    `;
    // Nota: 'metodo_pago' se podría establecer cuando el barbero confirma
    // 'fecha_pago_confirmado' también se actualiza al confirmar.
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

    // 2. Insertar en la tabla 'cita_servicios'
    const citaId = nuevaCita.id;
    for (const servicio_id of servicios) {
      const citaServicioQuery = `
        INSERT INTO cita_servicios (cita_id, servicio_id)
        VALUES ($1, $2);
      `;
      await client.query(citaServicioQuery, [citaId, servicio_id]);
    }
    console.log('BACKEND: Servicios asociados a la cita insertados.');

    await client.query('COMMIT'); // Finalizar transacción

    // Devolver la nueva cita completa (podrías hacer un JOIN para incluir nombres si quieres)
    res
      .status(201)
      .json({message: 'Cita creada exitosamente', appointment: nuevaCita});
  } catch (error) {
    await client.query('ROLLBACK'); // Revertir en caso de error
    console.error(
      '>>>>>>>>>>>>>> BACKEND: createAppointment - ERROR <<<<<<<<<<<<<<',
    );
    console.error('BACKEND createAppointment CATCH: Mensaje:', error.message);
    console.error('BACKEND createAppointment CATCH: Stack:', error.stack);
    res.status(500).json({error: 'Error del servidor al crear la cita.'});
  } finally {
    client.release();
  }
};

// --- OBTENER CITAS DE UN USUARIO (CLIENTE) ---
const getUserAppointments = async (req, res) => {
  const {userId} = req.params;
  console.log(`BACKEND: Obteniendo citas para usuario ID: ${userId}`);
  try {
    // Query para obtener citas y detalles asociados
    // Es importante traer el nombre del barbero y de la barbería para mostrar en la lista
    const query = `
      SELECT 
        c.id, c.fecha, c.hora, c.monto_total, c.estado_pago, c.metodo_pago,
        b.nombre AS nombre_barberia,
        u_barbero.name AS nombre_barbero, -- Asumiendo que el nombre del barbero está en 'users.name'
        (SELECT STRING_AGG(s.nombre, ', ') 
           FROM cita_servicios cs 
           JOIN servicios s ON cs.servicio_id = s.id 
           WHERE cs.cita_id = c.id) AS servicios_nombres,
        -- Construir una URL para el QR aquí o simplemente pasar datos para que el frontend la genere
        -- Ejemplo de datos para QR: Monto, Nombre del Barbero/Barbería, Referencia de Cita
        -- Podrías tener una columna qr_data en la tabla 'barberos' o 'barberias' con su info de pago
        -- O generar la URL del QR dinámicamente
        -- Por ahora, vamos a simular que el barbero tiene una URL de QR
        -- (Idealmente, esta URL de QR se generaría o almacenaría de forma más robusta)
        -- Para tu flujo, parece que el barbero tiene una URL de QR (qr_imagen_url)
        -- Esta podría estar en la tabla 'barberos' o 'users' (para el barbero)
        u_barbero.avatar AS qr_imagen_url -- USANDO AVATAR COMO PLACEHOLDER PARA QR_IMAGEN_URL
                                        -- DEBES AJUSTAR ESTO A CÓMO REALMENTE OBTIENES LA URL DEL QR DEL BARBERO
      FROM citas c
      JOIN barberias b ON c.barberia_id = b.id
      JOIN users u_barbero ON c.barbero_id = u_barbero.id -- Asumiendo que barbero_id en 'citas' es el users.id del barbero
      WHERE c.usuario_id = $1
      ORDER BY c.fecha DESC, c.hora DESC;
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error(
      'Error al obtener citas del usuario:',
      error.message,
      error.stack,
    );
    res.status(500).json({error: 'Error del servidor.'});
  }
};

// --- OBTENER CITAS DE UN BARBERO ---
const getBarberAppointments = async (req, res) => {
  const {barberUserId} = req.params; // ID del usuario barbero
  console.log(
    `BACKEND: Obteniendo citas para barbero (usuario ID): ${barberUserId}`,
  );
  try {
    // Similar a getUserAppointments pero filtrando por barbero_id
    // y trayendo el nombre del cliente
    const query = `
      SELECT 
        c.id, c.fecha, c.hora, c.monto_total, c.estado_pago, c.metodo_pago,
        b.nombre AS nombre_barberia,
        u_cliente.name AS nombre_cliente, -- Nombre del cliente
        (SELECT STRING_AGG(s.nombre, ', ') 
           FROM cita_servicios cs 
           JOIN servicios s ON cs.servicio_id = s.id 
           WHERE cs.cita_id = c.id) AS servicios_nombres
      FROM citas c
      JOIN barberias b ON c.barberia_id = b.id
      JOIN users u_cliente ON c.usuario_id = u_cliente.id -- Join para obtener nombre del cliente
      WHERE c.barbero_id = $1 -- Asumiendo que barbero_id en 'citas' es el users.id del barbero
      ORDER BY c.fecha DESC, c.hora DESC;
    `;
    const result = await pool.query(query, [barberUserId]);
    res.json(result.rows);
  } catch (error) {
    console.error(
      'Error al obtener citas del barbero:',
      error.message,
      error.stack,
    );
    res.status(500).json({error: 'Error del servidor.'});
  }
};

// --- ACTUALIZAR ESTADO DE PAGO DE UNA CITA (POR EL BARBERO) ---
const updateAppointmentPaymentStatus = async (req, res) => {
  const {citaId} = req.params;
  const {estado_pago, metodo_pago} = req.body; // 'Pagado' o 'Pendiente'

  console.log(
    `BACKEND: Actualizando estado de pago para cita ID: ${citaId} a ${estado_pago}`,
  );

  if (!estado_pago || (estado_pago === 'Pagado' && !metodo_pago)) {
    return res.status(400).json({
      error:
        'Faltan datos: estado_pago es requerido, y metodo_pago si el estado es "Pagado".',
    });
  }

  try {
    const query = `
      UPDATE citas 
      SET 
        estado_pago = $1, 
        metodo_pago = CASE WHEN $1 = 'Pagado' THEN $2 ELSE metodo_pago END, -- Solo actualiza método si se paga
        fecha_pago_confirmado = CASE WHEN $1 = 'Pagado' THEN NOW() ELSE NULL END -- Solo actualiza fecha si se paga
      WHERE id = $3
      RETURNING *; 
    `;
    const result = await pool.query(query, [estado_pago, metodo_pago, citaId]);

    if (result.rows.length === 0) {
      return res.status(404).json({error: 'Cita no encontrada.'});
    }

    console.log('BACKEND: Estado de pago de cita actualizado:', result.rows[0]);
    res.json({
      message: `Estado de pago de la cita actualizado a ${estado_pago}.`,
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error(
      'Error al actualizar estado de pago:',
      error.message,
      error.stack,
    );
    res
      .status(500)
      .json({error: 'Error del servidor al actualizar estado de pago.'});
  }
};

module.exports = {
  createAppointment,
  getUserAppointments,
  getBarberAppointments,
  updateAppointmentPaymentStatus,
};
