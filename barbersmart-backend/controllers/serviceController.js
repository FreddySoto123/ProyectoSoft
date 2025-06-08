// barbersmart-backend/controllers/serviceController.js
const db = require('../db'); // Ajusta la ruta a tu archivo de conexión db.js

// Obtener todos los servicios activos
exports.getAllServices = async (req, res) => {
  try {
    // Ajusta la consulta SQL según tu esquema de base de datos
    // Por ejemplo, si tienes una columna 'activo' para filtrar servicios visibles
    const result = await db.query(
      'SELECT id, nombre, descripcion, precio, duracion_estimada_minutos FROM servicios WHERE activo = TRUE ORDER BY nombre ASC',
    );
    if (result.rows.length === 0) {
      // Puedes decidir si devolver un array vacío o un mensaje específico
      // return res.status(404).json({ message: 'No hay servicios activos disponibles.' });
      return res.json([]); // Devolver array vacío es común
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener servicios:', err.message);
    res.status(500).json({error: 'Error interno del servidor al obtener servicios.'});
  }
};

// Aquí podrías añadir más funciones del controlador en el futuro si las necesitas:
// exports.getServiceById = async (req, res) => { ... };
// exports.createService = async (req, res) => { ... };
// etc.