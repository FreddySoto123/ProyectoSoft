// controllers/barberController.js
const pool = require('../db');

// Obtener detalles de un barbero específico por su usuario_id
const getBarberProfileById = async (req, res) => {
  const {userId} = req.params; // Usaremos el userId que es el ID de la tabla 'users'
  console.log(
    `>>>>>>>>>>>>>> BACKEND: getBarberProfileById - INICIO para userId: ${userId} <<<<<<<<<<<<<<`,
  );
  try {
    const query = `
      SELECT 
        u.id AS usuario_id,
        u.name AS nombre,
        u.email,
        u.telefono, -- Si ya añadiste esta columna a 'users'
        u.avatar,
         b.id AS barbero_id,  -- ID del registro en la tabla 'Barberos'
        b.barberia_id, -- Para saber en qué barbería principal trabaja o para referencia
        bar.nombre AS nombre_barberia, -- Nombre de la barbería principal
        b.especialidad,
        b.descripcion_profesional,
        b.calificacion_promedio,
        b.activo
      FROM users u
      JOIN Barberos b ON u.id = b.usuario_id
      LEFT JOIN barberias bar ON b.barberia_id = bar.id -- LEFT JOIN para que no falle si no tiene barberia_id (aunque debería)
      WHERE u.id = $1 AND u.rol = 'Barbero'; -- Asegurarse de que es un barbero
    `;
    // Nota: Si un barbero puede estar en múltiples barberías, necesitarías un enfoque diferente
    // para listar todas sus barberías o su barbería "actual". Este query asume una principal.

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      console.log(
        `BACKEND: getBarberProfileById - Barbero no encontrado o no es rol 'Barbero' con userId: ${userId}`,
      );
      return res.status(404).json({
        error: 'Perfil de barbero no encontrado o el usuario no es un barbero.',
      });
    }

    const barberProfile = result.rows[0];
    console.log(
      'BACKEND: getBarberProfileById - Perfil de barbero encontrado:',
      barberProfile,
    );

    // Opcional: Aquí podrías hacer más queries para obtener, por ejemplo:
    // - Horarios específicos del barbero (de la tabla Horarios_Barbero)
    // - Reseñas del barbero (si tienes una tabla de reseñas)
    // - Portafolio de trabajos (si tienes una tabla para ello)
    // barberProfile.horarios = await getBarberSchedules(userId);
    // barberProfile.reseñas = await getBarberReviews(userId);

    res.json(barberProfile);
  } catch (error) {
    console.error(
      '>>>>>>>>>>>>>> BACKEND: getBarberProfileById - ERROR <<<<<<<<<<<<<<',
    );
    console.error(
      'BACKEND getBarberProfileById CATCH: Mensaje:',
      error.message,
    );
    console.error('BACKEND getBarberProfileById CATCH: Stack:', error.stack);
    res
      .status(500)
      .json({error: 'Error del servidor al obtener el perfil del barbero.'});
  }
};

module.exports = {
  getBarberProfileById,
  // Otras funciones relacionadas con barberos...
};
