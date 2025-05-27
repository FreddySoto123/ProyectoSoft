// controllers/simulationController.js
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require('@google/generative-ai');
const mime = require('mime-types');
const axios = require('axios');
const FormData = require('form-data'); // Asegúrate de tener form-data instalado

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('CRÍTICO: GEMINI_API_KEY no definida.');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function urlToGenerativePart(imageUrl, defaultMimeType = 'image/jpeg') {
  // ... (sin cambios en esta función, ya la tienes bien)
  if (!imageUrl || !imageUrl.startsWith('http')) {
    throw new Error(`URL de imagen inválida o no proporcionada: ${imageUrl}`);
  }
  console.log(
    `BACKEND SIMCONTRL: Descargando imagen desde URL: ${imageUrl.substring(
      0,
      60,
    )}...`,
  );
  try {
    const response = await axios.get(imageUrl, {responseType: 'arraybuffer'});
    const imageBuffer = Buffer.from(response.data, 'binary');
    let mimeType = response.headers['content-type'] || defaultMimeType;

    if (!mimeType.startsWith('image/')) {
      const guessedMimeType = mime.lookup(imageUrl.split('?')[0]);
      mimeType =
        guessedMimeType && guessedMimeType.startsWith('image/')
          ? guessedMimeType
          : defaultMimeType;
    }

    const supportedMimeTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/heic',
      'image/heif',
    ];
    if (!supportedMimeTypes.includes(mimeType)) {
      console.warn(
        `BACKEND SIMCONTRL: MIME type de entrada ${mimeType} para ${imageUrl.substring(
          0,
          30,
        )}... no está en la lista de soportados explícitamente por Gemini. Se usará de todas formas.`,
      );
    }

    console.log(
      `BACKEND SIMCONTRL: MIME type para imagen de entrada ${imageUrl.substring(
        0,
        30,
      )}... : ${mimeType}`,
    );
    return {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };
  } catch (error) {
    console.error(
      `BACKEND SIMCONTRL: Error descargando o procesando imagen desde ${imageUrl}:`,
      error.message,
    );
    throw new Error(
      `Error al procesar la imagen URL ${imageUrl.substring(0, 30)}... : ${
        error.message
      }`,
    );
  }
}

const generateHairstyleSimulation = async (req, res) => {
  console.log(
    '>>>>>>>>>>>>>> BACKEND: generateHairstyleSimulation - INICIO <<<<<<<<<<<<<<',
  );
  const {userImageUri, hairstyleImageUri, hairstyleName, userId} = req.body;
  console.log('BACKEND SIMCONTRL: Datos recibidos:', {
    userImageUri,
    hairstyleImageUri,
    hairstyleName,
    userId,
  });

  if (!userImageUri || !hairstyleImageUri || !hairstyleName) {
    return res.status(400).json({
      error:
        'Faltan datos: imagen de usuario, imagen de estilo y nombre del estilo son requeridos.',
    });
  }
  if (!GEMINI_API_KEY) {
    console.error(
      'BACKEND SIMCONTRL: GEMINI_API_KEY no configurada en el entorno.',
    );
    return res.status(500).json({error: 'Servicio de IA no configurado.'});
  }

  try {
    const modelName = 'gemini-2.0-flash-preview-image-generation';
    console.log(`BACKEND SIMCONTRL: Usando modelo Gemini: ${modelName}`);

    const model = genAI.getGenerativeModel({
      model: modelName,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        // ... (otras configuraciones de seguridad)
      ],
    });

    console.log('BACKEND SIMCONTRL: Preparando partes generativas...');
    const userImagePart = await urlToGenerativePart(userImageUri);
    const styleImagePart = await urlToGenerativePart(hairstyleImageUri);

    const textPrompt = `Edita la primera imagen (rostro de la persona) para aplicar el estilo de peinado de la segunda imagen (referencia de corte). Estilo: "${hairstyleName}". Resultado: fotorealista, manteniendo rasgos y tono de piel. Simplifica el fondo. Genera la imagen resultante. Si es necesario, puedes generar texto explicativo breve, pero prioriza la imagen.`;
    // Ajuste el prompt para permitir texto, ya que el modelo parece esperar "IMAGE, TEXT" como modalidad

    const contents = [
      {
        role: 'user',
        parts: [userImagePart, styleImagePart, {text: textPrompt}],
      },
    ];

    // SIN responseMimeType aquí. Confiamos en que el modelo devuelva un stream con partes de imagen y/o texto.
    const generationConfig = {
      candidateCount: 1,
      temperature: 0.5,
    };

    console.log(
      "BACKEND SIMCONTRL: Enviando petición a Gemini con 'generateContentStream'. Config (SIN responseMimeType explícito):",
      JSON.stringify(generationConfig),
    );

    const streamResult = await model.generateContentStream({
      contents: contents,
      generationConfig: generationConfig,
    });

    console.log(
      'BACKEND SIMCONTRL: Stream de Gemini recibido, procesando chunks...',
    );

    let foundImagePart = null;
    let aggregatedText = ''; // Para recolectar cualquier texto que venga

    for await (const chunk of streamResult.stream) {
      // console.log("BACKEND SIMCONTRL: Chunk recibido:", JSON.stringify(chunk, null, 2)); // Para depuración
      if (
        chunk.candidates &&
        chunk.candidates[0].content &&
        chunk.candidates[0].content.parts
      ) {
        for (const part of chunk.candidates[0].content.parts) {
          if (
            part.inlineData &&
            part.inlineData.mimeType &&
            part.inlineData.mimeType.startsWith('image/')
          ) {
            console.log(
              `BACKEND SIMCONTRL: Parte de imagen encontrada en chunk. MIME: ${part.inlineData.mimeType}`,
            );
            foundImagePart = part;
            // No rompemos aquí, por si viniera más texto después de la imagen en el stream.
          } else if (part.text) {
            console.log(
              'BACKEND SIMCONTRL: Parte de texto en chunk:',
              part.text.substring(0, 100) + '...',
            );
            aggregatedText += part.text;
          }
        }
      }
      // Si ya tenemos la imagen Y el stream sugiere que es la única candidata (o no esperamos más imágenes), podríamos salir.
      // Por ahora, procesamos todos los chunks para recolectar todo el texto.
    }

    if (foundImagePart && foundImagePart.inlineData) {
      const generatedImageMimeType = foundImagePart.inlineData.mimeType;
      const base64ImageData = foundImagePart.inlineData.data;

      console.log(
        `BACKEND SIMCONTRL: Imagen generada por Gemini (desde stream). MIME Type: ${generatedImageMimeType}`,
      );
      if (aggregatedText) {
        console.log(
          'BACKEND SIMCONTRL: Texto agregado de Gemini:',
          aggregatedText.substring(0, 200) + '...',
        );
      }

      const base64ImageForClient = `data:${generatedImageMimeType};base64,${base64ImageData}`;

      let imageUrlOnline = null;
      if (IMGBB_API_KEY) {
        // ... (lógica de ImgBB sin cambios)
        try {
          const formData = new FormData();
          formData.append('image', base64ImageData);
          const imgbbResponse = await axios.post(
            `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
            formData,
            {
              headers: formData.getHeaders(),
            },
          );
          if (
            imgbbResponse.data &&
            imgbbResponse.data.data &&
            imgbbResponse.data.data.url
          ) {
            imageUrlOnline = imgbbResponse.data.data.url;
            console.log(
              'BACKEND SIMCONTRL: Imagen subida a ImgBB:',
              imageUrlOnline,
            );
          }
        } catch (imgbbError) {
          console.error(
            'BACKEND SIMCONTRL: Error al subir imagen a ImgBB:',
            imgbbError.message,
          );
          if (imgbbError.response)
            console.error('ImgBB Error Response:', imgbbError.response.data);
        }
      }

      return res.json({
        generatedImageBase64: base64ImageForClient,
        generatedImageUrl: imageUrlOnline,
        textResponse: aggregatedText || null, // Incluir el texto si lo hubo
      });
    } else {
      console.error(
        'BACKEND SIMCONTRL: No se encontró inlineData de imagen en los chunks de la respuesta de Gemini Stream.',
      );
      if (aggregatedText) {
        console.log(
          'BACKEND SIMCONTRL: Texto agregado de Gemini (sin imagen):',
          aggregatedText.substring(0, 500) + '...',
        );
      }

      const finalResponse = await streamResult.response;
      const promptFeedback = finalResponse?.promptFeedback;
      if (promptFeedback && promptFeedback.blockReason) {
        console.error(
          'BACKEND SIMCONTRL: Prompt bloqueado (stream). Razón:',
          promptFeedback.blockReason,
          'Ratings:',
          promptFeedback.safetyRatings,
        );
        throw new Error(
          `El prompt fue bloqueado por Gemini (stream): ${promptFeedback.blockReason}.`,
        );
      }
      if (
        finalResponse?.candidates?.[0]?.finishReason &&
        finalResponse.candidates[0].finishReason !== 'STOP'
      ) {
        throw new Error(
          `Generación (stream) interrumpida. Razón: ${
            finalResponse.candidates[0].finishReason
          }. Ratings: ${JSON.stringify(
            finalResponse.candidates[0].safetyRatings,
          )}`,
        );
      }
      throw new Error(
        'Respuesta de Gemini Stream no contenía una imagen válida. Texto recibido: ' +
          (aggregatedText
            ? aggregatedText.substring(0, 300) + '...'
            : 'Ninguno'),
      );
    }
  } catch (error) {
    // ... (manejo de error sin cambios)
    console.error(
      '>>>>>>>>>>>>>> BACKEND: generateHairstyleSimulation - ERROR EN CATCH FINAL <<<<<<<<<<<<<<',
    );
    let errorMessage =
      error.message || 'Error desconocido al generar la simulación.';
    console.error(
      'BACKEND generateHairstyleSimulation CATCH: Mensaje Final:',
      errorMessage,
    );
    if (error.response && error.response.data) {
      console.error(
        'BACKEND generateHairstyleSimulation CATCH: Error data de API (Gemini u otra):',
        JSON.stringify(error.response.data, null, 2),
      );
      if (!errorMessage.startsWith('[GoogleGenerativeAI Error]')) {
        errorMessage = `Error de la API: ${
          error.response.data.error?.message ||
          JSON.stringify(error.response.data)
        }`;
      }
    } else if (error.stack) {
      console.error(
        'BACKEND generateHairstyleSimulation CATCH: Stack:',
        error.stack,
      );
    }
    res.status(500).json({
      error: 'Error del servidor al generar la simulación.',
      details: errorMessage,
    });
  }
};

module.exports = {
  generateHairstyleSimulation,
};
