// routes/appointmentRoutes.js
const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getUserAppointments,
  getBarberAppointments,
  updateAppointmentPaymentStatus,
} = require('../controllers/appointmentController'); // Ajusta la ruta

// POST /api/appointments - Crear una nueva cita
router.post('/', createAppointment);

// GET /api/appointments/user/:userId - Obtener todas las citas de un cliente
router.get('/user/:userId', getUserAppointments);

// GET /api/appointments/barber/:barberUserId - Obtener todas las citas de un barbero
router.get('/barber/:barberUserId', getBarberAppointments);

// PUT /api/appointments/:citaId/payment-status - Actualizar el estado de pago de una cita
router.put('/:citaId/payment-status', updateAppointmentPaymentStatus);

module.exports = router;
