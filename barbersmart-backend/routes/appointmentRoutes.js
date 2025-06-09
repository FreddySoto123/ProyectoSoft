// routes/appointmentRoutes.js
const express = require('express');
const router = express.Router();
// ASUME que tienes un middleware de autenticación (ej. verifyToken)
// const verifyToken = require('../middleware/authMiddleware'); // Ejemplo

const {
  createAppointment,
  getUserAppointments,
  getBarberAppointments,
  updateAppointmentStatusByBarber,
  getLibelulaPaymentUrlForAppointment,
  libelulaPaymentCallback,
  confirmManualPaymentByBarber,
  cancelAppointmentByClient,
} = require('../controllers/appointmentController');

// Todas las rutas de citas podrían requerir autenticación
// router.use(verifyToken); // APLICA A TODAS LAS RUTAS DE ABAJO

// POST /api/appointments - Crear una nueva cita (Cliente)
router.post('/', /*verifyToken,*/ createAppointment);

// GET /api/appointments/user/:userId - Obtener todas las citas de un cliente (Cliente)
// El :userId aquí debería ser el del usuario autenticado, no cualquiera.
// Es mejor obtenerlo de req.user.id del token.
router.get('/user/:userId', getUserAppointments); // Cambiar a /user/me y usar req.user.id

// GET /api/appointments/barber/:barberUserId - Obtener todas las citas de un barbero (Barbero)
// Similar, el :barberUserId debería ser el del barbero autenticado.
router.get('/barber/:barberUserId', /*verifyToken,*/ getBarberAppointments); // Cambiar a /barber/me

// PUT /api/appointments/:citaId/status - Barbero actualiza estado_cita
router.put('/:citaId/status', /*verifyToken,*/ updateAppointmentStatusByBarber);

// POST /api/appointments/:citaId/request-payment-url - Cliente solicita URL de pago
router.post(
  '/:citaId/request-payment-url',
  /*verifyToken,*/ getLibelulaPaymentUrlForAppointment,
);

// POST o GET /api/appointments/libelula-callback - Webhook de Libélula (NO necesita token de tu app)
router.post('/libelula-callback', libelulaPaymentCallback);
router.get('/libelula-callback', libelulaPaymentCallback); // Soportar ambos por si acaso

// PUT /api/appointments/:citaId/confirm-manual-payment - Barbero confirma pago manual
router.put(
  '/:citaId/confirm-manual-payment',
  /*verifyToken,*/ confirmManualPaymentByBarber,
);
// PUT /api/appointments/:citaId/cancel-by-client - Cliente cancela su cita
router.put('/:citaId/cancel-by-client', cancelAppointmentByClient);
module.exports = router;
