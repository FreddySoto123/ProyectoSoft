const pool = require('../db');

// Obtener todas las barberías
const getAllBarbershops = async (req, res) => {
  console.log(
    '>>>>>>>>>>>>>> BACKEND: getAllBarbershops - INICIO <<<<<<<<<<<<<<',
  );
  try {
    // Seleccionamos los campos que probablemente necesitemos en el frontend para la lista
    const query = `
      SELECT 
        id, 
        nombre, 
        direccion, 
        logo_url, 
        horario_apertura, 
        horario_cierre, 
        dias_laborales 
      FROM barberias
      ORDER BY nombre ASC; -- Ordenar alfabéticamente es una buena práctica
    `;
    const result = await pool.query(query);

    console.log(
      `BACKEND: getAllBarbershops - ${result.rows.length} barberías encontradas.`,
    );
    res.json(result.rows); // Devuelve un array de objetos barbería
  } catch (error) {
    console.error(
      '>>>>>>>>>>>>>> BACKEND: getAllBarbershops - ERROR <<<<<<<<<<<<<<',
    );
    console.error('BACKEND getAllBarbershops CATCH: Mensaje:', error.message);
    console.error('BACKEND getAllBarbershops CATCH: Stack:', error.stack);
    res
      .status(500)
      .json({error: 'Error del servidor al obtener las barberías.'});
  }
};

// Obtener una barbería por ID con sus servicios y barberos
const getBarbershopById = async (req, res) => {
  const {id} = req.params;
  console.log(
    `>>>>>>>>>>>>>> BACKEND: getBarbershopById - INICIO para ID: ${id} <<<<<<<<<<<<<<`,
  );
  try {
    // 1. Obtener datos de la barbería
    const barbershopQuery = 'SELECT * FROM barberias WHERE id = $1';
    const barbershopResult = await pool.query(barbershopQuery, [id]);

    if (barbershopResult.rows.length === 0) {
      console.log(
        `BACKEND: getBarbershopById - Barbería no encontrada con ID: ${id}`,
      );
      return res.status(404).json({error: 'Barbería no encontrada'});
    }
    const barbershop = barbershopResult.rows[0];
    console.log(
      'BACKEND: getBarbershopById - Datos de la barbería:',
      barbershop,
    );

    // 2. Obtener servicios de la barbería
    const servicesQuery =
      'SELECT * FROM servicios WHERE barberia_id = $1 ORDER BY nombre ASC';
    const servicesResult = await pool.query(servicesQuery, [id]);
    barbershop.servicios = servicesResult.rows; // Añadir como un array al objeto barbershop
    console.log(
      `BACKEND: getBarbershopById - ${barbershop.servicios.length} servicios encontrados.`,
    );

    // 3. Obtener barberos de la barbería (uniendo con la tabla 'users' para obtener nombre y avatar del barbero)
    const barbersQuery = `
      SELECT 
        b.id AS barbero_id,          -- ID real en tabla barberos
        b.usuario_id,                -- ID del usuario (para referencia)
        b.especialidad,
        b.descripcion_profesional,
        b.calificacion_promedio,
        b.activo,
        u.name AS nombre_barbero,
        u.avatar AS avatar_barbero
      FROM barberos b
      JOIN users u ON b.usuario_id = u.id
      WHERE b.barberia_id = $1 AND b.activo = TRUE
      ORDER BY u.name ASC;
    `;
    const barbersResult = await pool.query(barbersQuery, [id]);
    barbershop.barberos = barbersResult.rows; // Añadir como un array al objeto barbershop
    console.log(
      `BACKEND: getBarbershopById - ${barbershop.barberos.length} barberos encontrados.`,
    );

    res.json(barbershop); // Devuelve el objeto barbershop con 'servicios' y 'barberos' anidados
  } catch (error) {
    console.error(
      '>>>>>>>>>>>>>> BACKEND: getBarbershopById - ERROR <<<<<<<<<<<<<<',
    );
    console.error('BACKEND getBarbershopById CATCH: Mensaje:', error.message);
    console.error('BACKEND getBarbershopById CATCH: Stack:', error.stack);
    res.status(500).json({
      error: 'Error del servidor al obtener los detalles de la barbería.',
    });
  }
};

module.exports = {
  getAllBarbershops,
  getBarbershopById,
};
