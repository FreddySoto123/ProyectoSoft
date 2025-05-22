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
      FROM Barberias 
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

module.exports = {
  getAllBarbershops,
};
