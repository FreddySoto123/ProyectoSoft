// backend/controllers/authController.js
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // Asegúrate de instalar: npm install jsonwebtoken

// Registro de usuario
const register = async (req, res) => {
  const {name, email, password, rol = 'Cliente', telefono, avatar, forma_rostro} = req.body; // Rol por defecto Cliente, y otros campos opcionales

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Guardar todos los campos relevantes, incluyendo el rol
    const query = `
      INSERT INTO users (name, email, password, rol, telefono, avatar, forma_rostro)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, rol, avatar, telefono, forma_rostro;
    `;
    const values = [name, email, hashedPassword, rol, telefono, avatar, forma_rostro];

    const result = await pool.query(query, values);

    // El objeto 'user' devuelto no debe incluir la contraseña
    const userRegistered = result.rows[0];

    res.status(201).json({message: 'Usuario registrado exitosamente', user: userRegistered});
  } catch (error) {
    console.error('Error al registrar usuario:', error.message);
    if (error.code === '23505') { // Violación de constraint UNIQUE (ej. email duplicado)
        return res.status(409).json({ error: 'El correo electrónico ya está en uso.' });
    }
    res.status(500).json({error: 'Error del servidor al registrar el usuario.'});
  }
};

// Inicio de sesión
const login = async (req, res) => {
  console.log('--- LOGIN ATTEMPT (BACKEND) ---');
  console.log('Request Body:', req.body);

  const {email, password} = req.body;

  if (!email || !password) {
    console.warn('Login: Email o contraseña faltantes.');
    return res.status(400).json({error: 'Email y contraseña son requeridos.'});
  }

  try {
    console.log('Buscando usuario con email:', email);
    // Seleccionar todos los campos necesarios del usuario, incluyendo 'rol' y 'avatar'
    const result = await pool.query(
      'SELECT id, name, email, password, avatar, rol, telefono, forma_rostro FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];

    if (!user) {
      console.warn('Login: Usuario no encontrado para email:', email);
      return res.status(401).json({error: 'Credenciales incorrectas.'}); // No dar pistas
    }
    console.log('Usuario encontrado:', { id: user.id, name: user.name, email: user.email, rol: user.rol });

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.warn('Login: Contraseña incorrecta para usuario:', user.email);
      return res.status(401).json({error: 'Credenciales incorrectas.'}); // No dar pistas
    }

    console.log('Login exitoso para:', user.email, '- Rol:', user.rol);

    // Generar token JWT
    const tokenPayload = {
        userId: user.id,
        email: user.email,
        rol: user.rol,
        name: user.name // Puedes añadir más info si la necesitas rápido en el frontend
    };
    const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET, // Asegúrate que JWT_SECRET está en tu .env
        { expiresIn: '24h' } // Duración del token
    );
    console.log('Token JWT generado.');

    // Excluir la contraseña del objeto 'user' que se envía al frontend
    const {password: _, ...userWithoutPassword} = user;

    console.log('Enviando respuesta 200 OK con datos del usuario y token.');
    console.log('--- END LOGIN ATTEMPT (BACKEND) ---');
    return res.status(200).json({
        message: 'Login exitoso', // Este mensaje es más para el log
        user: userWithoutPassword, // Contiene id, name, email, avatar, rol, etc.
        token: token
    });

  } catch (error) {
    console.error('--- ERROR EN LOGIN (BACKEND) ---');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    if (!res.headersSent) { // Evitar enviar respuesta si ya se envió una
        return res.status(500).json({error: 'Error del servidor durante el login.'});
    }
  }
};

// Actualizar perfil
const updateProfile = async (req, res) => {
  const {id} = req.params;
  const {name, email, avatar, telefono, forma_rostro} = req.body;

  console.log(`--- UPDATE PROFILE (BACKEND) for ID: ${id} ---`);
  console.log('Request Body:', req.body);

  if (!id) {
    return res.status(400).json({error: 'ID de usuario es requerido.'});
  }

  try {
    const fieldsToUpdate = [];
    const values = [];
    let paramCount = 1;

    // Construir la query dinámicamente
    if (name !== undefined) { fieldsToUpdate.push(`name = $${paramCount++}`); values.push(name.trim()); }
    if (email !== undefined) { fieldsToUpdate.push(`email = $${paramCount++}`); values.push(email.trim().toLowerCase()); }
    if (avatar !== undefined) { fieldsToUpdate.push(`avatar = $${paramCount++}`); values.push(avatar); }
    if (telefono !== undefined) { fieldsToUpdate.push(`telefono = $${paramCount++}`); values.push(telefono); }
    if (forma_rostro !== undefined) { fieldsToUpdate.push(`forma_rostro = $${paramCount++}`); values.push(forma_rostro); }

    if (fieldsToUpdate.length === 0) {
      console.log('UpdateProfile: No hay campos para actualizar. Obteniendo perfil actual.');
      // Si no hay nada que actualizar, simplemente obtenemos y devolvemos el perfil actual
      // (aunque el frontend podría evitar esta llamada si no hay cambios)
      const currentUserResult = await pool.query(
        'SELECT id, name, email, avatar, telefono, forma_rostro, rol FROM users WHERE id = $1',
        [id],
      );
      if (currentUserResult.rows.length === 0) {
        return res.status(404).json({error: 'Usuario no encontrado.'});
      }
      return res.status(200).json({
        message: 'No se especificaron cambios, perfil actual devuelto.',
        user: currentUserResult.rows[0],
      });
    }

    values.push(id); // ID para la cláusula WHERE

    const querySetClause = fieldsToUpdate.join(', ');
    // Devolver todos los campos relevantes del perfil, excepto la contraseña
    const query = `
      UPDATE users
      SET ${querySetClause}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, name, email, avatar, telefono, forma_rostro, rol;
    `;

    console.log('Update Query:', query);
    console.log('Values:', values);

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({error: 'Usuario no encontrado para actualizar.'});
    }

    console.log('Perfil actualizado exitosamente.');
    return res.status(200).json({message: 'Perfil actualizado exitosamente', user: result.rows[0]});

  } catch (error) {
    console.error('--- ERROR EN UPDATE PROFILE (BACKEND) ---');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    if (error.code === '23505') { // Violación de constraint UNIQUE
      return res.status(409).json({error: 'El correo electrónico ya está en uso por otra cuenta.'});
    }
    if (!res.headersSent) {
      return res.status(500).json({error: 'Error del servidor al actualizar el perfil.'});
    }
  }
};

// Obtener perfil
const getProfile = async (req, res) => {
  const {id} = req.params;
  console.log(`--- GET PROFILE (BACKEND) for ID: ${id} ---`);

  try {
    // Seleccionar todos los campos necesarios, incluyendo rol y avatar
    const result = await pool.query(
      'SELECT id, name, email, avatar, telefono, forma_rostro, rol FROM users WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      console.warn('GetProfile: Usuario no encontrado para ID:', id);
      return res.status(404).json({error: 'Usuario no encontrado.'});
    }

    console.log('Perfil encontrado.');
    return res.status(200).json({user: result.rows[0]});

  } catch (error) {
    console.error('--- ERROR EN GET PROFILE (BACKEND) ---');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    if (!res.headersSent) {
      return res.status(500).json({error: 'Error del servidor al obtener el perfil.'});
    }
  }
};

module.exports = {
  register,
  login,
  updateProfile,
  getProfile,
};