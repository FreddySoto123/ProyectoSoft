// backend/controllers/authController.js
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');

const register = async (req, res) => {
  const {
    name,
    email,
    password,
    rol = 'Cliente',
    telefono,
    avatar,
    forma_rostro,
  } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({error: 'Nombre, email y contraseña son requeridos.'});
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (name, email, password, rol, telefono, avatar, forma_rostro)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, rol, avatar, telefono, forma_rostro;
    `;
    const values = [
      name,
      email,
      hashedPassword,
      rol,
      telefono,
      avatar,
      forma_rostro,
    ];

    const result = await pool.query(query, values);

    const userRegistered = result.rows[0];

    res
      .status(201)
      .json({message: 'Usuario registrado exitosamente', user: userRegistered});
  } catch (error) {
    console.error('Error al registrar usuario:', error.message);
    if (error.code === '23505') {
      return res
        .status(409)
        .json({error: 'El correo electrónico ya está en uso.'});
    }
    res
      .status(500)
      .json({error: 'Error del servidor al registrar el usuario.'});
  }
};

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
    const result = await pool.query(
      'SELECT id, name, email, password, avatar, rol, telefono, forma_rostro FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];

    if (!user) {
      console.warn('Login: Usuario no encontrado para email:', email);
      return res.status(401).json({error: 'Credenciales incorrectas.'});
    }
    console.log('Usuario encontrado:', {
      id: user.id,
      name: user.name,
      email: user.email,
      rol: user.rol,
    });

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.warn('Login: Contraseña incorrecta para usuario:', user.email);
      return res.status(401).json({error: 'Credenciales incorrectas.'});
    }

    console.log('Login exitoso para:', user.email, '- Rol:', user.rol);

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      rol: user.rol,
      name: user.name,
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });
    console.log('Token JWT generado.');

    const {password: _, ...userWithoutPassword} = user;

    console.log('Enviando respuesta 200 OK con datos del usuario y token.');
    console.log('--- END LOGIN ATTEMPT (BACKEND) ---');
    return res.status(200).json({
      message: 'Login exitoso',
      user: userWithoutPassword,
      token: token,
    });
  } catch (error) {
    console.error('--- ERROR EN LOGIN (BACKEND) ---');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({error: 'Error del servidor durante el login.'});
    }
  }
};

const updateMyProfile = async (req, res) => {
  const userId = req.user?.userId; // ID del usuario autenticado
  const {
    name,
    email,
    avatar,
    telefono,
    forma_rostro /*, currentPassword, newPassword */,
  } = req.body;

  if (!userId) {
    return res.status(400).json({error: 'Autenticación requerida.'});
  }
  console.log(
    `BACKEND: Actualizando perfil para usuario autenticado ID: ${userId} con datos:`,
    req.body,
  );

  try {
    const fieldsToUpdate = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      fieldsToUpdate.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (email !== undefined) {
      fieldsToUpdate.push(`email = $${paramCount++}`);
      values.push(email.trim().toLowerCase());
    }
    if (avatar !== undefined) {
      fieldsToUpdate.push(`avatar = $${paramCount++}`);
      values.push(avatar);
    }
    if (telefono !== undefined) {
      fieldsToUpdate.push(`telefono = $${paramCount++}`);
      values.push(telefono);
    }
    if (forma_rostro !== undefined) {
      fieldsToUpdate.push(`forma_rostro = $${paramCount++}`);
      values.push(forma_rostro);
    }

    if (fieldsToUpdate.length === 0) {
      console.log(
        'UpdateProfile: No hay campos para actualizar. Obteniendo perfil actual.',
      );
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

    values.push(userId); // Para la cláusula WHERE id = $X

    const querySetClause = fieldsToUpdate.join(', ');
    const query = `
      UPDATE users 
      SET ${querySetClause}, updated_at = NOW()
      WHERE id = $${paramCount} 
      RETURNING id, name, email, avatar, telefono, rol, forma_rostro;
    `;

    console.log('BACKEND updateMyProfile Query:', query);
    console.log('BACKEND updateMyProfile Values:', values);
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({error: 'Usuario no encontrado para actualizar.'});
    }
    res.json({
      message: 'Perfil actualizado exitosamente',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('BACKEND updateMyProfile CATCH:', error.message, error.stack);
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      // Asumiendo que tienes un constraint unique en email
      return res
        .status(409)
        .json({error: 'El correo electrónico ya está en uso por otra cuenta.'});
    }
    res
      .status(500)
      .json({
        error: 'Error del servidor al actualizar el perfil.',
        details: error.message,
      });
  }
};

const getMyProfile = async (req, res) => {
  // El userId viene del token JWT verificado por authMiddleware
  const userId = req.user?.userId;

  if (!userId) {
    // Esto no debería pasar si authMiddleware funciona, pero es una defensa
    return res.status(400).json({error: 'Autenticación requerida.'});
  }
  console.log(
    `BACKEND: Solicitud de perfil para usuario autenticado ID: ${userId}`,
  );
  try {
    const result = await pool.query(
      'SELECT id, name, email, avatar, telefono, rol, forma_rostro FROM users WHERE id = $1',
      [userId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({error: 'Perfil de usuario no encontrado.'});
    }
    // No es necesario devolver la contraseña, incluso hasheada.
    const {password, ...userProfile} = result.rows[0];
    res.json({user: userProfile});
  } catch (error) {
    console.error('BACKEND getMyProfile CATCH:', error.message, error.stack);
    res.status(500).json({error: 'Error del servidor al obtener el perfil.'});
  }
};

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD =
  process.env.EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD;
const EMAILJS_USER_ID_PUBLIC_KEY = process.env.EMAILJS_USER_ID_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

const initiatePasswordReset = async (req, res) => {
  const {email: rawEmail} = req.body;

  if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.trim()) {
    return res
      .status(400)
      .json({error: 'Se requiere un correo electrónico válido.'});
  }
  const email = rawEmail.trim().toLowerCase();
  console.log(`--- INITIATE PASSWORD RESET (BACKEND) for email: ${email} ---`);

  try {
    const userResult = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email],
    );
    if (userResult.rows.length === 0) {
      console.warn(
        `InitiateReset: Email ${email} no encontrado. Se responderá genéricamente.`,
      );
      return res.status(200).json({
        message:
          'Si tu correo está registrado, recibirás un código de verificación.',
      });
    }
    const user = userResult.rows[0];

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const hashedCode = await bcrypt.hash(verificationCode, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const upsertQuery = `
      INSERT INTO password_reset_tokens (email, token, created_at) 
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE 
      SET token = EXCLUDED.token, created_at = EXCLUDED.created_at;
    `;
    await pool.query(upsertQuery, [user.email, hashedCode, expiresAt]);
    console.log(`Código de reseteo (hasheado) guardado para ${user.email}.`);

    if (
      !EMAILJS_SERVICE_ID ||
      !EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD ||
      !EMAILJS_USER_ID_PUBLIC_KEY ||
      !EMAILJS_PRIVATE_KEY
    ) {
      console.error(
        'Error: Faltan credenciales de EmailJS (para API HTTP) en las variables de entorno del backend.',
      );
      return res.status(503).json({
        error:
          'Servicio de correo no disponible temporalmente. Intenta más tarde.',
      });
    }

    const emailPayload = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD,
      user_id: EMAILJS_USER_ID_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: {
        email: user.email,
        user_name: user.name || user.email.split('@')[0],
        verification_code: verificationCode,
      },
    };

    console.log('BACKEND: Intentando enviar email vía API HTTP de EmailJS...');

    try {
      const emailJsResponse = await axios.post(
        'https://api.emailjs.com/api/v1.0/email/send',
        emailPayload,
        {headers: {'Content-Type': 'application/json'}},
      );

      if (
        emailJsResponse.status === 200 &&
        typeof emailJsResponse.data === 'string' &&
        emailJsResponse.data.trim() === 'OK'
      ) {
        console.log(
          `Email de reseteo enviado exitosamente a ${user.email} vía EmailJS API.`,
        );
        res.status(200).json({
          message:
            'Se ha enviado un código de verificación a tu correo electrónico.',
          userName: user.name,
        });
      } else {
        console.error(
          'Respuesta inesperada de EmailJS API o error:',
          emailJsResponse.status,
          emailJsResponse.data,
        );
        res.status(502).json({
          error:
            'Problema al comunicarse con el servicio de correo (respuesta inesperada).',
          details:
            typeof emailJsResponse.data === 'string'
              ? emailJsResponse.data
              : 'Error no textual',
        });
      }
    } catch (axiosError) {
      console.error('--- ERROR EN AXIOS POST A EMAILJS (BACKEND) ---');
      let errorDetail = 'Error desconocido del servicio de correo.';
      if (axiosError.response) {
        console.error('EmailJS Data:', axiosError.response.data);
        console.error('EmailJS Status:', axiosError.response.status);
        errorDetail = `Error ${axiosError.response.status}: ${
          axiosError.response.data || 'Sin detalles adicionales'
        }`;
        if (axiosError.response.status === 403) {
          errorDetail =
            'Acceso denegado por el servicio de correo. Verifica tus API keys de EmailJS (especialmente la Private Key/Access Token).';
        }
      } else if (axiosError.request) {
        console.error(
          'EmailJS Request (no response): No se recibió respuesta del servicio de correo.',
        );
        errorDetail = 'No se recibió respuesta del servicio de correo.';
      } else {
        console.error(
          'Error configurando petición a EmailJS:',
          axiosError.message,
        );
        errorDetail = 'Error interno al preparar el envío de correo.';
      }
      res.status(502).json({
        error:
          'Se preparó el código, pero falló el envío del correo. Intenta de nuevo más tarde.',
        details: errorDetail,
      });
    }
  } catch (error) {
    console.error('--- ERROR GENERAL EN INITIATE PASSWORD RESET (BACKEND) ---');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    res
      .status(500)
      .json({error: 'Error del servidor al iniciar el reseteo de contraseña.'});
  }
};

const verifyResetCode = async (req, res) => {
  const {email, code} = req.body;
  if (!email || !code) {
    return res.status(400).json({error: 'Email y código son requeridos.'});
  }

  console.log(`--- VERIFY RESET CODE (BACKEND) for email: ${email} ---`);
  try {
    const tokenResult = await pool.query(
      'SELECT token, created_at FROM password_reset_tokens WHERE email = $1',
      [email],
    );
    if (tokenResult.rows.length === 0) {
      return res
        .status(400)
        .json({error: 'Código inválido o expirado (email no encontrado).'});
    }

    const storedToken = tokenResult.rows[0];
    const isCodeValid = await bcrypt.compare(code, storedToken.token);

    const expiresAt = new Date(storedToken.created_at);
    const now = new Date();

    if (!isCodeValid || now > expiresAt) {
      return res.status(400).json({error: 'Código inválido o expirado.'});
    }

    console.log(`Código verificado exitosamente para ${email}.`);
    res
      .status(200)
      .json({isValid: true, message: 'Código verificado correctamente.'});
  } catch (error) {
    console.error('--- ERROR EN VERIFY RESET CODE (BACKEND) ---');
    console.error('Mensaje:', error.message);
    res.status(500).json({error: 'Error del servidor al verificar el código.'});
  }
};

const resetPasswordWithCode = async (req, res) => {
  const {email, code, newPassword} = req.body;
  if (!email || !code || !newPassword) {
    return res
      .status(400)
      .json({error: 'Email, código y nueva contraseña son requeridos.'});
  }
  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({error: 'La nueva contraseña debe tener al menos 6 caracteres.'});
  }

  console.log(`--- RESET PASSWORD WITH CODE (BACKEND) for email: ${email} ---`);
  try {
    const tokenResult = await pool.query(
      'SELECT token, created_at FROM password_reset_tokens WHERE email = $1',
      [email],
    );
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        error:
          'Solicitud de reseteo no válida o expirada (email no encontrado).',
      });
    }

    const storedToken = tokenResult.rows[0];
    const isCodeValid = await bcrypt.compare(code, storedToken.token);
    const expiresAt = new Date(storedToken.created_at);
    const now = new Date();

    if (!isCodeValid || now > expiresAt) {
      return res
        .status(400)
        .json({error: 'Solicitud de reseteo no válida o expirada.'});
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2',
      [hashedNewPassword, email],
    );

    await pool.query('DELETE FROM password_reset_tokens WHERE email = $1', [
      email,
    ]);

    console.log(`Contraseña actualizada exitosamente para ${email}.`);
    res.status(200).json({message: 'Contraseña actualizada exitosamente.'});
  } catch (error) {
    console.error('--- ERROR EN RESET PASSWORD (BACKEND) ---');
    console.error('Mensaje:', error.message);
    res
      .status(500)
      .json({error: 'Error del servidor al resetear la contraseña.'});
  }
};

module.exports = {
  register,
  login,
  updateMyProfile,
  getMyProfile,
  initiatePasswordReset,
  verifyResetCode,
  resetPasswordWithCode,
};
