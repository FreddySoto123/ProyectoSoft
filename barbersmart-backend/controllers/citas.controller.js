let citas = [];

exports.getAllCitas = (req, res) => {
  res.json(citas);
};

exports.createCita = (req, res) => {
  const cita = req.body;
  if(!cita.usuario_id || !cita.barberia_id || !cita.barbero_id || !cita.servicios_id || !cita.fecha || !cita.hora) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }
  cita.id = citas.length + 1; // id simple
  citas.push(cita);
  res.status(201).json({ message: 'Cita creada', cita });
};
