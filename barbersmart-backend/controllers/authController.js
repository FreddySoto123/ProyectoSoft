const pool = require('../db');
const bcrypt = require('bcrypt');

// Registro de usuario
const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: 'Usuario registrado', user: result.rows[0] });
  } catch (error) {
    console.error('Error al registrar usuario:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// Inicio de sesión
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT id, name, email, password, avatar FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    res.json({ message: 'Login exitoso', user });
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// Actualizar perfil
const updateProfile = async (req, res) => {
  const { id } = req.params;
  const { name, email, password, avatar } = req.body;

  try {
    const query = `
      UPDATE users 
      SET name = $1, email = $2, password = $3, avatar = $4 
      WHERE id = $5 
      RETURNING id, name, email, avatar;
    `;

    const values = [name, email, password, avatar, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Perfil actualizado", user: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar el perfil:', error.message);
    res.status(500).json({ error: "Error al actualizar el perfil" });
  }
};
const getProfile = async (req, res) => {
  const { id } = req.params;

  try {
    const query = 'SELECT id, name, email, avatar FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener el perfil:', error.message);
    res.status(500).json({ error: "Error del servidor" });
  }
};

module.exports = {
  register,
  login,
  updateProfile, // ✅ Asegúrate de tener la coma aquí
  getProfile,
};
