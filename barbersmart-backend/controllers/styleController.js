const pool = require('../db');

const getAllHairstyles = async (req, res) => {
  console.log(
    '>>>>>>>>>>>>>> BACKEND: getAllHairstyles - INICIO <<<<<<<<<<<<<<',
  );
  try {
    const query = `
      SELECT 
        id, 
        nombre, 
        descripcion, 
        foto_referencia_url
        -- tags_ia -- Opcional si lo necesitas en el frontend ahora
      FROM Estilos_Corte 
      ORDER BY nombre ASC;
    `;
    const result = await pool.query(query);

    console.log(
      `BACKEND: getAllHairstyles - ${result.rows.length} estilos encontrados.`,
    );
    res.json(result.rows);
  } catch (error) {
    console.error(
      '>>>>>>>>>>>>>> BACKEND: getAllHairstyles - ERROR <<<<<<<<<<<<<<',
    );
    console.error('BACKEND getAllHairstyles CATCH: Mensaje:', error.message);
    console.error('BACKEND getAllHairstyles CATCH: Stack:', error.stack);
    res
      .status(500)
      .json({error: 'Error del servidor al obtener los estilos de corte.'});
  }
};

module.exports = {
  getAllHairstyles,
};
