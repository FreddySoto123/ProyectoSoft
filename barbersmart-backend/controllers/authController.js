const pool = require('../db');
const bcrypt = require('bcrypt');

// Registro de usuario
const register = async (req, res) => {
  const {name, email, password} = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
      [name, email, hashedPassword],
    );

    res.status(201).json({message: 'Usuario registrado', user: result.rows[0]});
  } catch (error) {
    console.error('Error al registrar usuario:', error.message);
    res.status(500).json({error: 'Error del servidor'});
  }
};

// Inicio de sesión
const login = async (req, res) => {
  console.log('-----------------------------------------');
  console.log('ENTRANDO A LA RUTA /login (BACKEND)');
  console.log('Request Body (req.body):', req.body);

  const {email, password} = req.body;

  if (!email || !password) {
    console.error('DATOS FALTANTES en la solicitud de login:', {
      email,
      password,
    });
    return res.status(400).json({error: 'Email y contraseña son requeridos'});
  }

  try {
    console.log('Buscando usuario con email:', email);
    const result = await pool.query(
      'SELECT id, name, email, password, avatar FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];

    if (!user) {
      console.log('Usuario no encontrado para email:', email);
      console.log('Respondiendo con error 404 - Usuario no encontrado');
      console.log('-----------------------------------------');
      return res.status(404).json({error: 'Usuario no encontrado'});
    }
    console.log('Usuario encontrado:', {
      id: user.id,
      name: user.name,
      email: user.email,
    });

    console.log('Comparando contraseña para usuario:', user.email);
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('Contraseña incorrecta para usuario:', user.email);
      console.log('Respondiendo con error 401 - Contraseña incorrecta');
      console.log('-----------------------------------------');
      return res.status(401).json({error: 'Contraseña incorrecta'});
    }

    console.log('Login exitoso para usuario:', user.email);
    console.log('Respondiendo con éxito 200');
    console.log('-----------------------------------------');
    // Remueve la contraseña del objeto usuario antes de enviarlo al frontend
    const {password: _, ...userWithoutPassword} = user;
    res.json({message: 'Login exitoso', user: userWithoutPassword});
  } catch (error) {
    console.error(
      '---------------- ERROR EN /login (BACKEND) ----------------',
    );
    console.error('Error al iniciar sesión:', error.message);
    console.error('Stack del error:', error.stack);
    console.log('Respondiendo con error 500 - Error en catch');
    console.log('-----------------------------------------');
    res.status(500).json({error: 'Error del servidor'});
  }
};

// Actualizar perfil
const updateProfile = async (req, res) => {
  const {id} = req.params; // ID del usuario a actualizar
  // Campos que el frontend envía en el body JSON
  const {name, email, avatar} = req.body;

  console.log(
    `>>>>>>>>>>>>>> BACKEND: updateProfile - INICIO DE LA FUNCIÓN PARA ID: ${id} <<<<<<<<<<<<<<`,
  );
  console.log(
    'BACKEND - req.body recibido:',
    JSON.stringify(req.body, null, 2),
  );

  if (!id) {
    console.error('BACKEND updateProfile: No se proporcionó ID de usuario.');
    return res.status(400).json({error: 'ID de usuario es requerido.'});
  }

  // Validación básica de los campos que podrías esperar
  if (name !== undefined && !name.trim()) {
    return res
      .status(400)
      .json({error: 'El nombre no puede estar vacío si se proporciona.'});
  }
  if (email !== undefined && !email.trim()) {
    // Podrías añadir validación de formato de email
    return res.status(400).json({
      error: 'El correo electrónico no puede estar vacío si se proporciona.',
    });
  }

  try {
    console.log(
      '>>>>>>>>>>>>>> BACKEND: updateProfile - DENTRO DEL BLOQUE TRY <<<<<<<<<<<<<<',
    );

    const fieldsToUpdate = [];
    const values = [];
    let paramCount = 1;

    // Construir dinámicamente la cláusula SET
    if (name !== undefined) {
      fieldsToUpdate.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (email !== undefined) {
      fieldsToUpdate.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (avatar !== undefined) {
      // 'avatar' es la URL de ImgBB o null si se quiere borrar
      fieldsToUpdate.push(`avatar = $${paramCount++}`);
      values.push(avatar); // Se guarda la URL directamente o null
    }

    // NOTA: NO estamos manejando 'password' aquí. Si se quisiera cambiar,
    // sería mejor un endpoint separado o lógica adicional muy cuidadosa.

    if (fieldsToUpdate.length === 0) {
      console.log(
        'BACKEND updateProfile: No hay campos válidos para actualizar. Devolviendo perfil actual.',
      );
      // Si no hay nada que actualizar, simplemente obtenemos y devolvemos el perfil actual
      const currentUserResult = await pool.query(
        'SELECT id, name, email, avatar FROM users WHERE id = $1',
        [id],
      );
      if (currentUserResult.rows.length === 0) {
        return res.status(404).json({error: 'Usuario no encontrado'});
      }
      return res.json({
        message: 'No se especificaron cambios, perfil actual devuelto.',
        user: currentUserResult.rows[0],
      });
    }

    values.push(id); // Añadir el ID del usuario para la cláusula WHERE al final de los valores

    const querySetClause = fieldsToUpdate.join(', ');
    const query = `
      UPDATE users 
      SET ${querySetClause}
      WHERE id = $${paramCount} 
      RETURNING id, name, email, avatar;
    `;

    console.log('BACKEND updateProfile: Query de actualización:', query);
    console.log('BACKEND updateProfile: Valores para la query:', values);

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      // Esto no debería pasar si el ID es correcto y el usuario existe,
      // a menos que haya una condición de carrera o el ID sea inválido.
      console.error(
        `BACKEND updateProfile: Usuario no encontrado con ID ${id} después del UPDATE.`,
      );
      return res
        .status(404)
        .json({error: 'Usuario no encontrado para actualizar.'});
    }

    console.log(
      'BACKEND updateProfile: Perfil actualizado exitosamente. Usuario devuelto:',
      result.rows[0],
    );
    res.json({message: 'Perfil actualizado', user: result.rows[0]});
  } catch (error) {
    console.error(
      '>>>>>>>>>>>>>> BACKEND: updateProfile - DENTRO DEL BLOQUE CATCH <<<<<<<<<<<<<<',
    );
    console.error('BACKEND updateProfile CATCH: Mensaje:', error.message);
    console.error('BACKEND updateProfile CATCH: Stack:', error.stack);
    console.error('BACKEND updateProfile CATCH: Código PG:', error.code);

    if (error.code === '23505') {
      // Violación de constraint UNIQUE (ej. email duplicado)
      return res
        .status(409)
        .json({error: 'El correo electrónico ya está en uso por otra cuenta.'});
    }
    // El error "el valor nulo en la columna «password»..." no debería ocurrir si 'password'
    // no está en la cláusula SET. Si sigue ocurriendo, es un trigger o algo más exótico.
    return res
      .status(500)
      .json({error: 'Error del servidor al actualizar el perfil.'});
  }
};

const getProfile = async (req, res) => {
  const {id} = req.params;
  console.log(
    `>>>>>>>>>>>>>> BACKEND: getProfile - Obteniendo perfil para ID: ${id} <<<<<<<<<<<<<<`,
  );
  try {
    const result = await pool.query(
      'SELECT id, name, email, avatar FROM users WHERE id = $1', // Asegúrate de incluir avatar
      [id],
    );
    if (result.rows.length === 0) {
      console.log(`BACKEND: getProfile - Usuario no encontrado para ID: ${id}`);
      return res.status(404).json({error: 'Usuario no encontrado'});
    }
    console.log('BACKEND: getProfile - Perfil encontrado:', result.rows[0]);
    res.json({user: result.rows[0]});
  } catch (error) {
    console.error('>>>>>>>>>>>>>> BACKEND: getProfile - ERROR <<<<<<<<<<<<<<');
    console.error(
      'BACKEND getProfile CATCH: Error al obtener el perfil:',
      error.message,
    );
    console.error('BACKEND getProfile CATCH: Stack:', error.stack);
    res.status(500).json({error: 'Error del servidor al obtener perfil'});
  }
};

module.exports = {
  register,
  login,
  updateProfile, // ✅ Asegúrate de tener la coma aquí
  getProfile,
};
