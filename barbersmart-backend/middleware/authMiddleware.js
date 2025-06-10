// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Para acceder a JWT_SECRET

const authMiddleware = (req, res, next) => {
  console.log('AUTH MIDDLEWARE: Verificando token...');

  // 1. Obtener el token de la cabecera Authorization
  const authHeader = req.headers.authorization; // O req.header('Authorization')

  if (!authHeader) {
    console.warn(
      'AUTH MIDDLEWARE: No se proporcionó token. Cabecera Authorization faltante.',
    );
    return res
      .status(401)
      .json({error: 'Acceso denegado. No se proporcionó token.'});
  }

  // El token usualmente viene como "Bearer <token>"
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    console.warn(
      "AUTH MIDDLEWARE: Token malformado. Formato esperado 'Bearer <token>'. Recibido:",
      authHeader,
    );
    return res.status(401).json({error: 'Token malformado.'});
  }

  const token = parts[1];

  if (!token) {
    console.warn("AUTH MIDDLEWARE: Token vacío después de 'Bearer'.");
    return res.status(401).json({error: 'Acceso denegado. Token no presente.'});
  }

  // 2. Verificar el token
  try {
    if (!process.env.JWT_SECRET) {
      console.error(
        'AUTH MIDDLEWARE: JWT_SECRET no está definido en las variables de entorno.',
      );
      throw new Error('Error de configuración del servidor.'); // No exponer el detalle al cliente
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Añadir la información decodificada del usuario al objeto `req`
    // El payload del token (lo que pusiste al firmarlo) estará en `decoded`.
    // Asumimos que al firmar el token incluiste 'userId', 'email', 'rol'.
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      rol: decoded.rol,
      name: decoded.name, // Si lo incluiste en el token
      // ... cualquier otro dato que hayas incluido en el payload del token
    };
    console.log(
      'AUTH MIDDLEWARE: Token verificado exitosamente. Usuario:',
      req.user.email,
      'Rol:',
      req.user.rol,
      'ID:',
      req.user.userId,
    );

    next(); // Pasa al siguiente middleware o al controlador de la ruta
  } catch (error) {
    console.warn('AUTH MIDDLEWARE: Error al verificar token:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res
        .status(401)
        .json({error: 'Token expirado. Por favor, inicia sesión de nuevo.'});
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({error: 'Token inválido.'});
    }
    // Para otros errores, podría ser un 500 si es un problema del servidor
    return res
      .status(401)
      .json({
        error: 'Fallo en la autenticación del token.',
        details: error.message,
      });
  }
};

module.exports = authMiddleware;
