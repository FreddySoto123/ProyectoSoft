// routes/auth.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit'); // <--- IMPORTAR
const {
  register,
  login,
  updateProfile,
  getProfile,
  initiatePasswordReset,
  verifyResetCode,
  resetPasswordWithCode,
} = require('../controllers/authController'); // Asegúrate que la ruta al controlador sea correcta
const authMiddleware = require('../middleware/authMiddleware');

// --- Configuración del Rate Limiter para el Login ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de tiempo: 15 minutos (en milisegundos)
  max: 5, // Límite de peticiones por IP dentro de la ventana de tiempo
  message: {
    error:
      'Demasiados intentos de inicio de sesión desde esta IP. Por favor, intenta de nuevo después de 15 minutos.',
  },
  standardHeaders: true, // Devuelve información del rate limit en las cabeceras `RateLimit-*`
  legacyHeaders: false, // Deshabilita las cabeceras `X-RateLimit-*` (más antiguas)
  keyGenerator: (req, res) => {
    // Usa la IP del cliente. Si estás detrás de un proxy (como en Vercel),
    // necesitas asegurarte de que Express esté configurado para confiar en el proxy
    // y que `req.ip` sea la IP real del cliente.
    // Vercel suele configurar esto bien.
    return req.ip;
  },
  handler: (req, res, next, options) => {
    // Handler personalizado para loguear y responder
    console.warn(
      `LOGIN RATE LIMIT: IP ${req.ip} ha excedido el límite de ${
        options.max
      } intentos. Bloqueado por ${options.windowMs / 60000} minutos.`,
    );
    res.status(options.statusCode).json(options.message);
  },
});

// --- Rutas ---
// Aplicar el limiter SOLO al endpoint de login
router.post('/login', loginLimiter, login); // <--- APLICAR loginLimiter ANTES del controlador de login

// El resto de tus rutas de autenticación
router.post('/register', register); // Considera un rate limiter diferente, menos estricto, para registro

// Rutas que requieren autenticación (token JWT)
// El middleware authMiddleware debería ir aquí para proteger estas rutas
router.put('/profile/:id', authMiddleware, updateProfile);
router.get('/profile/:id', authMiddleware, getProfile); // Este es el que queremos proteger de enumeración después

router.post('/initiate-password-reset', initiatePasswordReset); // Podría tener su propio rate limiter
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password-with-code', resetPasswordWithCode);

module.exports = router;
