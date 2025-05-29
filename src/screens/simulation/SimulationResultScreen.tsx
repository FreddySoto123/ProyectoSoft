// screens/simulation/SimulationResultScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView, // Asegúrate de que ScrollView esté importado
  Platform,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack'; // Si necesitas navegación específica
// import CameraRoll from "@react-native-community/cameraroll"; // Para guardar imagen (requiere configuración y permisos)
// import RNFS from 'react-native-fs'; // Si devuelves base64 y necesitas guardarla como archivo primero

// Define los tipos para los parámetros de ruta
type RootStackParamList = {
  SimulationResultScreen: {
    userId: string;
    userImageUri: string; // URL de la imagen original del usuario
    hairstyleId: string; // ID del estilo seleccionado (o nombre)
    hairstyleImageUri?: string; // URL de la imagen de referencia del estilo (opcional si usas ID)
  };
  // ... otras rutas
};

type SimulationResultScreenRouteProp = RouteProp<
  RootStackParamList,
  'SimulationResultScreen'
>;
// type SimulationResultScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SimulationResultScreen'>; // Si necesitas métodos de navegación específicos

const SimulationResultScreen: React.FC = () => {
  const navigation = useNavigation(); // Uso genérico si solo usas goBack()
  const route = useRoute<SimulationResultScreenRouteProp>();

  const {userId, userImageUri, hairstyleId, hairstyleImageUri} =
    route.params || {};

  const [loading, setLoading] = useState(true);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userImageUri || !hairstyleId || !userId) {
      Alert.alert(
        'Error',
        'Faltan datos para iniciar la simulación. Por favor, intenta de nuevo.',
      );
      setError('Datos incompletos para la simulación.');
      setLoading(false);
      // Podrías añadir navigation.goBack() aquí
      return;
    }

    const generateSimulation = async () => {
      setLoading(true);
      setError(null);
      console.log(
        'SIMULATION RESULT SCREEN - Solicitando generación al backend con:',
      );
      console.log({
        userId,
        userImageUri,
        hairstyleImageUri,
        hairstyleName: hairstyleId,
      }); // hairstyleId aquí podría ser el nombre/id del estilo

      try {
        // El backend espera userImageUri y hairstyleImageUri (URLs de las imágenes de entrada)
        // y hairstyleName
        const bodyPayload: {
          userId: string;
          userImageUri: string;
          hairstyleImageUri?: string;
          hairstyleName: string;
        } = {
          userId,
          userImageUri,
          hairstyleName: hairstyleId, // Asumiendo que hairstyleId es el nombre o ID que el backend puede usar
        };

        if (hairstyleImageUri) {
          bodyPayload.hairstyleImageUri = hairstyleImageUri;
        }

        const response = await fetch(
          'http://localhost:3001/api/simulations/generate',
          {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(bodyPayload),
          },
        );
        const data = await response.json();

        if (
          response.ok &&
          (data.generatedImageUrl || data.generatedImageBase64)
        ) {
          console.log(
            'SIMULATION RESULT SCREEN - Simulación generada:',
            data.generatedImageUrl || 'Base64 Data',
          );
          setGeneratedImage(
            data.generatedImageUrl || data.generatedImageBase64,
          );
        } else {
          console.error('SIMULATION RESULT SCREEN - Error del backend:', data);
          setError(
            data.error || 'No se pudo generar la simulación desde el backend.',
          );
          Alert.alert(
            'Error de Simulación',
            data.error || 'No se pudo generar la simulación.',
          );
        }
      } catch (e) {
        console.error(
          'SIMULATION RESULT SCREEN - Error de red al generar simulación:',
          e,
        );
        setError('Error de red al generar la simulación.');
        Alert.alert(
          'Error de Red',
          'No se pudo conectar con el servidor de simulación.',
        );
      } finally {
        setLoading(false);
      }
    };

    generateSimulation();
  }, [userId, userImageUri, hairstyleId, hairstyleImageUri]); // Dependencias del useEffect

  const handleSaveImage = async () => {
    if (generatedImage) {
      Alert.alert(
        'Guardar Imagen',
        'Funcionalidad para guardar imagen no implementada aún. Se requiere @react-native-community/cameraroll y permisos de almacenamiento.',
      );
      console.log(
        'Intentando guardar imagen:',
        generatedImage.substring(0, 50) + '...',
      );
      // Ejemplo de cómo podría ser con CameraRoll (necesita permisos WRITE_EXTERNAL_STORAGE en Android)
      // try {
      //   if (generatedImage.startsWith('data:image')) { // Es base64
      //     // Necesitas guardar base64 como archivo temporal primero
      //     const base64Data = generatedImage.split(',')[1];
      //     const tempPath = `${RNFS.CachesDirectoryPath}/simulated_hairstyle_${Date.now()}.png`;
      //     await RNFS.writeFile(tempPath, base64Data, 'base64');
      //     await CameraRoll.save(`file://${tempPath}`, { type: 'photo', album: 'BarberSmart' });
      //     Alert.alert("Guardado", "Imagen guardada en tu galería.");
      //     await RNFS.unlink(tempPath); // Eliminar archivo temporal
      //   } else { // Es una URL
      //     await CameraRoll.save(generatedImage, { type: 'photo', album: 'BarberSmart' });
      //     Alert.alert("Guardado", "Imagen guardada en tu galería.");
      //   }
      // } catch (error) {
      //   console.error("Error al guardar imagen:", error);
      //   Alert.alert("Error", "No se pudo guardar la imagen. Asegúrate de tener permisos de almacenamiento.");
      // }
    }
  };

  if (loading) {
    return (
      <View style={styles.containerCenter}>
        <ActivityIndicator size="large" color="#333" />
        <Text style={styles.loadingText}>
          Generando tu simulación con IA...
        </Text>
        <Text style={styles.loadingSubText}>
          Esto puede tomar unos momentos.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.containerCenter}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.button}>
          <Text style={styles.buttonText}>Intentar de Nuevo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Resultado de la Simulación</Text>

      {generatedImage ? (
        <Image
          source={{uri: generatedImage}}
          style={styles.resultImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.resultImagePlaceholder}>
          <Text style={styles.placeholderText}>
            No se pudo generar la imagen.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, !generatedImage && styles.buttonDisabled]}
        onPress={handleSaveImage}
        disabled={!generatedImage}>
        <Text style={styles.buttonText}>Guardar Imagen</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>Probar Otro Estilo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('ImageCaptureScreen', { userId: userId })}>
        <Text style={styles.secondaryButtonText}>Nueva Simulación</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
    backgroundColor: '#f4f0e8',
  },
  containerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f4f0e8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
  },
  resultImage: {
    width: Platform.OS === 'ios' ? 340 : 320, // Ligeramente diferente para cada plataforma
    height: Platform.OS === 'ios' ? 440 : 420,
    borderRadius: 12,
    marginBottom: 25,
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  resultImagePlaceholder: {
    width: Platform.OS === 'ios' ? 340 : 320,
    height: Platform.OS === 'ios' ? 440 : 420,
    borderRadius: 12,
    marginBottom: 25,
    backgroundColor: '#e9e9e9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
  },
  button: {
    backgroundColor: '#007AFF', // Un azul más vibrante para la acción principal
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '90%',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
  },
  secondaryButton: {
    // Estilo para botones de acción secundaria
    backgroundColor: '#6c757d', // Un gris
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '90%',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 18,
    color: '#444',
    marginTop: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 17,
    color: '#c0392b',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
});

export default SimulationResultScreen;
