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
  console.log("-----------------------------------------");
  console.log("ENTRANDO A LA RUTA /login (BACKEND)");
  console.log("Request Body (req.body):", req.body);

  const { email, password } = req.body;

  if (!email || !password) {
    console.error("DATOS FALTANTES en la solicitud de login:", { email, password });
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  try {
    console.log("Buscando usuario con email:", email);
    const result = await pool.query('SELECT id, name, email, password, avatar FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      console.log("Usuario no encontrado para email:", email);
      console.log("Respondiendo con error 404 - Usuario no encontrado");
      console.log("-----------------------------------------");
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    console.log("Usuario encontrado:", {id: user.id, name: user.name, email: user.email});

    console.log("Comparando contraseña para usuario:", user.email);
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("Contraseña incorrecta para usuario:", user.email);
      console.log("Respondiendo con error 401 - Contraseña incorrecta");
      console.log("-----------------------------------------");
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    console.log("Login exitoso para usuario:", user.email);
    console.log("Respondiendo con éxito 200");
    console.log("-----------------------------------------");
    // Remueve la contraseña del objeto usuario antes de enviarlo al frontend
    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Login exitoso', user: userWithoutPassword });

  } catch (error) {
    console.error('---------------- ERROR EN /login (BACKEND) ----------------');
    console.error('Error al iniciar sesión:', error.message);
    console.error('Stack del error:', error.stack);
    console.log("Respondiendo con error 500 - Error en catch");
    console.log("-----------------------------------------");
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
