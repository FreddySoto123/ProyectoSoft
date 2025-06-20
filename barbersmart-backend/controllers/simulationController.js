// controllers/simulationController.js
const {
  GoogleGenAI, // CAMBIADO desde GoogleGenerativeAI
  Modality, // NUEVO, importado de @google/genai
  HarmCategory,
  HarmBlockThreshold,
} = require('@google/genai'); // CAMBIADO el paquete a @google/genai
const mime = require('mime-types');
const axios = require('axios');
const FormData = require('form-data');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('CRÍTICO: GEMINI_API_KEY no definida en el entorno.');
  // throw new Error('CRÍTICO: GEMINI_API_KEY no definida en el entorno.');
}

// CAMBIADO: Usando GoogleGenAI del paquete @google/genai
const genAI = new GoogleGenAI({apiKey: GEMINI_API_KEY});

/**
 * Descarga una imagen desde una URL y la prepara como una parte generativa para Gemini.
 * (Esta función se mantiene igual, ya que es útil y funciona bien)
 */
async function urlToGenerativePart(imageUrl, defaultMimeType = 'image/jpeg') {
  if (!imageUrl || !imageUrl.startsWith('http')) {
    console.error(
      `BACKEND SIMCONTRL: URL de imagen inválida o no proporcionada: ${imageUrl}`,
    );
    throw new Error(
      `URL de imagen inválida o no proporcionada: ${
        imageUrl ? imageUrl.substring(0, 60) + '...' : 'undefined'
      }`,
    );
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
      `BACKEND SIMCONTRL: Error descargando o procesando imagen desde ${imageUrl.substring(
        0,
        60,
      )}... :`,
      error.message,
    );
    if (error.response) {
      console.error(
        'BACKEND SIMCONTRL: Error response data:',
        error.response.data,
      );
      console.error(
        'BACKEND SIMCONTRL: Error response status:',
        error.response.status,
      );
    }
    throw new Error(
      `Error al procesar la imagen URL ${imageUrl.substring(0, 30)}... : ${
        error.message
      }`,
    );
  }
}

const generateHairstyleSimulation = async (req, res) => {
  console.log(
    '>>>>>>>>>>>>>> BACKEND: generateHairstyleSimulation - INICIO (método generateContent) <<<<<<<<<<<<<<',
  );
  const {userImageUri, hairstyleImageUri, hairstyleName, userId} = req.body;
  console.log('BACKEND SIMCONTRL: Datos recibidos:', {
    userImageUri: userImageUri
      ? userImageUri.substring(0, 60) + '...'
      : 'undefined',
    hairstyleImageUri: hairstyleImageUri
      ? hairstyleImageUri.substring(0, 60) + '...'
      : 'undefined',
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
    // CAMBIADO: Nombre del modelo según el ejemplo para generación de imágenes
    const modelName = 'gemini-2.0-flash-exp-image-generation';
    console.log(`BACKEND SIMCONTRL: Usando modelo Gemini: ${modelName}`);

    // NOTA: Con `genAI.models.generateContent`, los safetySettings y generationConfig
    // se pasan directamente en el objeto de la llamada.

    console.log('BACKEND SIMCONTRL: Preparando partes generativas...');
    const userImagePart = await urlToGenerativePart(userImageUri);
    const styleImagePart = await urlToGenerativePart(hairstyleImageUri);

    const textPrompt = `Eres un asistente de IA experto en edición de imágenes y estilismo.
Tarea: Tomar la primera imagen (rostro de una persona) y aplicar el estilo de peinado que se muestra en la segunda imagen (referencia del corte de cabello o peinado).
Nombre del estilo de peinado: "${hairstyleName}".
Instrucciones detalladas:
1. Analiza la estructura facial y el cabello existente en la primera imagen.
2. Adapta el peinado de la segunda imagen al rostro de la primera persona de la manera más realista posible.
3. Mantén los rasgos faciales originales de la persona (ojos, nariz, boca, forma de la cara).
4. Mantén el tono de piel original de la persona.
5. El resultado debe ser una imagen fotorealista de alta calidad.
6. Simplifica o genera un fondo neutro si el fondo original distrae o es complejo.
7. Prioriza la generación de la imagen. Si es absolutamente necesario, puedes agregar un texto muy breve (1-2 frases) describiendo alguna consideración importante sobre la adaptación del peinado, pero la imagen es el entregable principal.
Output: Genera la imagen editada.`;

    const contents = [
      {
        // role: 'user', // Con genAI.models.generateContent, 'role' es implícito o no necesario aquí
        parts: [userImagePart, styleImagePart, {text: textPrompt}],
      },
    ];

    const generationConfig = {
      candidateCount: 1,
      maxOutputTokens: 8192,
      temperature: 0.6,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    console.log(
      "BACKEND SIMCONTRL: Enviando petición a Gemini con 'generateContent'. Config:",
      JSON.stringify(generationConfig),
    );
    console.log(
      'BACKEND SIMCONTRL: Contenido del prompt (texto):',
      textPrompt.substring(0, 200) + '...',
    );

    // CAMBIADO: Usando genAI.models.generateContent (no streaming)
    const result = await genAI.models.generateContent({
      model: modelName,
      contents: contents,
      generationConfig: generationConfig,
      safetySettings: safetySettings,
      config: {
        // Esta 'config' anidada es específica para responseModalities según tu ejemplo
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    // La respuesta de genAI.models.generateContent ya es el objeto completo
    const response = result; // El SDK de @google/genai puede devolverlo directamente o anidado. Ajusta si es necesario.

    console.log(
      'BACKEND SIMCONTRL: Respuesta de Gemini recibida, procesando partes...',
    );
    // console.log('BACKEND SIMCONTRL: Respuesta completa de Gemini:', JSON.stringify(response, null, 2));

    let foundImagePart = null;
    let aggregatedText = '';

    if (
      response.candidates &&
      response.candidates[0] &&
      response.candidates[0].content &&
      response.candidates[0].content.parts &&
      response.candidates[0].content.parts.length > 0
    ) {
      for (const part of response.candidates[0].content.parts) {
        if (
          part.inlineData &&
          part.inlineData.mimeType &&
          part.inlineData.mimeType.startsWith('image/')
        ) {
          console.log(
            `BACKEND SIMCONTRL: Parte de IMAGEN encontrada. MIME: ${part.inlineData.mimeType}`,
          );
          if (!foundImagePart) {
            foundImagePart = part;
          } else {
            console.warn(
              'BACKEND SIMCONTRL: Múltiples partes de imagen recibidas, usando la primera.',
            );
          }
        } else if (part.text) {
          // console.log(
          //   'BACKEND SIMCONTRL: Parte de TEXTO encontrada:',
          //   part.text.substring(0, 100) + '...',
          // );
          aggregatedText += part.text;
        } else {
          console.log(
            'BACKEND SIMCONTRL: Parte desconocida encontrada:',
            JSON.stringify(part),
          );
        }
      }
    } else {
      // Manejar el caso donde no hay candidatos o partes válidas
      console.error(
        'BACKEND SIMCONTRL: Respuesta de Gemini no tiene la estructura esperada (candidates/parts).',
        JSON.stringify(response, null, 2),
      );
      // Verificar promptFeedback aquí si es necesario
      const promptFeedback = response?.promptFeedback;
      if (promptFeedback && promptFeedback.blockReason) {
        console.error(
          'BACKEND SIMCONTRL: Prompt bloqueado. Razón:',
          promptFeedback.blockReason,
          'Ratings:',
          promptFeedback.safetyRatings,
        );
        throw new Error(
          `El prompt fue bloqueado por Gemini: ${promptFeedback.blockReason}.`,
        );
      }
      throw new Error(
        "Respuesta de Gemini no contenía partes válidas o fue bloqueada sin detalles claros en 'candidates'.",
      );
    }

    if (aggregatedText) {
      console.log(
        'BACKEND SIMCONTRL: Texto total agregado de Gemini:',
        aggregatedText.substring(0, 500) +
          (aggregatedText.length > 500 ? '...' : ''),
      );
    }

    if (foundImagePart && foundImagePart.inlineData) {
      const generatedImageMimeType = foundImagePart.inlineData.mimeType;
      const base64ImageData = foundImagePart.inlineData.data;

      console.log(
        `BACKEND SIMCONTRL: Imagen generada por Gemini. MIME Type: ${generatedImageMimeType}. Longitud Base64: ${base64ImageData.length}`,
      );

      const base64ImageForClient = `data:${generatedImageMimeType};base64,${base64ImageData}`;

      let imageUrlOnline = null;
      if (IMGBB_API_KEY) {
        console.log('BACKEND SIMCONTRL: Intentando subir imagen a ImgBB...');
        try {
          const formData = new FormData();
          formData.append('image', base64ImageData);

          const imgbbResponse = await axios.post(
            `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
              },
              timeout: 30000,
            },
          );

          if (
            imgbbResponse.data &&
            imgbbResponse.data.data &&
            imgbbResponse.data.data.url
          ) {
            imageUrlOnline = imgbbResponse.data.data.url;
            console.log(
              'BACKEND SIMCONTRL: Imagen subida a ImgBB exitosamente:',
              imageUrlOnline,
            );
          } else {
            console.warn(
              'BACKEND SIMCONTRL: Respuesta de ImgBB no contenía URL de imagen:',
              imgbbResponse.data,
            );
          }
        } catch (imgbbError) {
          console.error(
            'BACKEND SIMCONTRL: Error al subir imagen a ImgBB:',
            imgbbError.message,
          );
          if (imgbbError.response) {
            console.error(
              'BACKEND SIMCONTRL: ImgBB Error Response Status:',
              imgbbError.response.status,
            );
            console.error(
              'BACKEND SIMCONTRL: ImgBB Error Response Data:',
              JSON.stringify(imgbbError.response.data, null, 2),
            );
          } else {
            console.error(
              'BACKEND SIMCONTRL: ImgBB Error (sin respuesta detallada):',
              imgbbError,
            );
          }
        }
      } else {
        console.log(
          'BACKEND SIMCONTRL: IMGBB_API_KEY no configurada, no se subirá la imagen.',
        );
      }

      return res.json({
        message: 'Simulación generada exitosamente.',
        generatedImageBase64: base64ImageForClient,
        generatedImageUrl: imageUrlOnline,
        textResponse: aggregatedText || null,
        userId: userId,
        hairstyleName: hairstyleName,
      });
    } else {
      console.error(
        'BACKEND SIMCONTRL: No se encontró inlineData de imagen en la respuesta de Gemini.',
      );

      // La respuesta 'response' ya es la respuesta final.
      const promptFeedback = response?.promptFeedback;
      const finishReason = response?.candidates?.[0]?.finishReason;
      const safetyRatings = response?.candidates?.[0]?.safetyRatings;

      let errorMessage = 'Respuesta de Gemini no contenía una imagen válida.';
      if (aggregatedText) {
        errorMessage +=
          ' Texto recibido: ' + aggregatedText.substring(0, 300) + '...';
      }

      if (promptFeedback && promptFeedback.blockReason) {
        console.error(
          'BACKEND SIMCONTRL: Prompt bloqueado. Razón:',
          promptFeedback.blockReason,
          'Ratings:',
          promptFeedback.safetyRatings,
        );
        errorMessage = `El prompt fue bloqueado por Gemini: ${promptFeedback.blockReason}.`;
      } else if (
        finishReason &&
        finishReason !== 'STOP' &&
        finishReason !== 'MAX_TOKENS'
      ) {
        console.error(
          `BACKEND SIMCONTRL: Generación interrumpida. Razón: ${finishReason}. Safety Ratings: ${JSON.stringify(
            safetyRatings,
          )}`,
        );
        errorMessage = `Generación interrumpida. Razón: ${finishReason}.`;
      }

      console.error('BACKEND SIMCONTRL: ' + errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error) {
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
        'BACKEND generateHairstyleSimulation CATCH: Error data de API externa:',
        JSON.stringify(error.response.data, null, 2),
      );
      if (
        !errorMessage.startsWith('[GoogleGenerativeAI Error]') && // O la clase de error de @google/genai
        error.response.data.error?.message
      ) {
        errorMessage = `Error de la API externa: ${error.response.data.error.message}`;
      } else if (!errorMessage.startsWith('[GoogleGenerativeAI Error]')) {
        errorMessage = `Error de la API externa: ${JSON.stringify(
          error.response.data,
        )}`;
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
