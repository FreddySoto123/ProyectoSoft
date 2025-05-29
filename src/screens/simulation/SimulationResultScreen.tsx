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
  ScrollView,
  Platform,
  PermissionsAndroid, // Para Android
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import {PERMISSIONS, request, RESULTS, check} from 'react-native-permissions';

// Define los tipos para los parámetros de ruta (asegúrate que ImageCaptureScreen esté aquí si lo usas)
type RootStackParamList = {
  SimulationResultScreen: {
    userId: string;
    userImageUri: string;
    hairstyleId: string;
    hairstyleImageUri?: string;
  };
  ImageCaptureScreen: {userId: string}; // Añadido para el tipado de navegación
  // ... otras rutas
};

type SimulationResultScreenRouteProp = RouteProp<
  RootStackParamList,
  'SimulationResultScreen'
>;

const SimulationResultScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<SimulationResultScreenRouteProp>();

  const {userId, userImageUri, hairstyleId, hairstyleImageUri} =
    route.params || {};

  const [loading, setLoading] = useState(true);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulationTextResponse, setSimulationTextResponse] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!userImageUri || !hairstyleId || !userId) {
      Alert.alert(
        'Error',
        'Faltan datos para iniciar la simulación. Por favor, intenta de nuevo.',
      );
      setError('Datos incompletos para la simulación.');
      setLoading(false);
      return;
    }

    const generateSimulation = async () => {
      setLoading(true);
      setError(null);
      setSimulationTextResponse(null);
      console.log(
        'SIMULATION RESULT SCREEN - Solicitando generación al backend con:',
      );
      console.log({
        userId,
        userImageUri,
        hairstyleImageUri,
        hairstyleName: hairstyleId,
      });

      try {
        const bodyPayload = {
          userId,
          userImageUri,
          hairstyleName: hairstyleId,
          hairstyleImageUri,
        };
        if (hairstyleImageUri)
          bodyPayload.hairstyleImageUri = hairstyleImageUri;

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
          (data.generatedImageBase64 || data.generatedImageUrl)
        ) {
          setGeneratedImage(
            data.generatedImageBase64 || data.generatedImageUrl,
          );
          if (data.textResponse) setSimulationTextResponse(data.textResponse);
        } else {
          const errorMessage =
            data.details || data.error || 'No se pudo generar la simulación.';
          setError(errorMessage);
          Alert.alert('Error de Simulación', errorMessage);
        }
      } catch (e: any) {
        setError(`Error de red o JS: ${e.message || 'Error desconocido.'}`);
        Alert.alert(
          'Error',
          `No se pudo conectar o procesar: ${
            e.message || 'Error desconocido.'
          }`,
        );
      } finally {
        setLoading(false);
      }
    };
    generateSimulation();
  }, [userId, userImageUri, hairstyleId, hairstyleImageUri]);

  const requestStoragePermissionAndroid = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    const apiLevel = Platform.Version as number;
    let permissionToRequest: any;

    if (apiLevel >= 33) {
      permissionToRequest = PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;
    } else {
      permissionToRequest = PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
    }

    try {
      const currentStatus = await check(permissionToRequest);
      if (currentStatus === RESULTS.GRANTED) return true;

      const result = await request(permissionToRequest);
      return result === RESULTS.GRANTED;
    } catch (err) {
      console.error(
        'Error solicitando permiso de almacenamiento en Android:',
        err,
      );
      return false;
    }
  };

  const requestPhotoLibraryPermissionIOS = async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') return true;
    try {
      const result = await request(PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY);
      return result === RESULTS.GRANTED;
    } catch (err) {
      console.error('Error solicitando permiso de galería en iOS:', err);
      return false;
    }
  };

  const handleSaveImage = async () => {
    if (!generatedImage || isSaving) return;
    setIsSaving(true);

    const hasPermission =
      Platform.OS === 'ios'
        ? await requestPhotoLibraryPermissionIOS()
        : await requestStoragePermissionAndroid();

    if (!hasPermission) {
      Alert.alert(
        'Permiso Denegado',
        'Se necesita permiso para acceder a la galería/almacenamiento para guardar la imagen.',
      );
      setIsSaving(false);
      return;
    }

    let imagePathToSave = '';
    let tempFileCreated = false;

    try {
      if (generatedImage.startsWith('data:image')) {
        const base64Data = generatedImage.split(',')[1];
        const fileExtension =
          generatedImage.substring(
            'data:image/'.length,
            generatedImage.indexOf(';base64'),
          ) || 'png';
        const tempPath = `${
          RNFS.CachesDirectoryPath
        }/simulated_hairstyle_${Date.now()}.${fileExtension}`;

        await RNFS.writeFile(tempPath, base64Data, 'base64');
        imagePathToSave = `file://${tempPath}`;
        tempFileCreated = true;
      } else if (generatedImage.startsWith('http')) {
        const fileExtensionMatch = generatedImage.match(
          /\.(jpeg|jpg|gif|png|webp)(\?|$)/i,
        );
        const fileExtension = fileExtensionMatch
          ? fileExtensionMatch[1]
          : 'jpg';
        const tempPath = `${
          RNFS.CachesDirectoryPath
        }/simulated_hairstyle_${Date.now()}.${fileExtension}`;

        const download = RNFS.downloadFile({
          fromUrl: generatedImage,
          toFile: tempPath,
        });
        const result = await download.promise;

        if (result.statusCode === 200) {
          imagePathToSave = `file://${tempPath}`;
          tempFileCreated = true;
        } else {
          throw new Error(
            `Fallo al descargar la imagen. Código: ${result.statusCode}`,
          );
        }
      } else {
        imagePathToSave = generatedImage;
      }

      if (imagePathToSave) {
        await CameraRoll.save(imagePathToSave, {
          type: 'photo',
          album: 'BarberSmart',
        });
        Alert.alert(
          'Guardado',
          '¡Imagen guardada en tu galería en el álbum BarberSmart!',
        );
      } else {
        throw new Error(
          'No se pudo determinar la ruta de la imagen para guardar.',
        );
      }
    } catch (error: any) {
      console.error('Error al guardar imagen:', error);
      Alert.alert(
        'Error',
        `No se pudo guardar la imagen: ${
          error.message || 'Error desconocido.'
        }`,
      );
    } finally {
      if (tempFileCreated && imagePathToSave.startsWith('file://')) {
        const pathOnly = imagePathToSave.substring('file://'.length);
        RNFS.exists(pathOnly).then(exists => {
          if (exists)
            RNFS.unlink(pathOnly).catch(e =>
              console.warn('Error al eliminar archivo temporal:', e),
            );
        });
      }
      setIsSaving(false);
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
        style={[
          styles.button,
          (!generatedImage || isSaving) && styles.buttonDisabled,
        ]}
        onPress={handleSaveImage}
        disabled={!generatedImage || isSaving}>
        <Text style={styles.buttonText}>
          {isSaving ? 'Guardando...' : 'Guardar Imagen'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>Probar Otro Estilo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          if (!userId) {
            Alert.alert('Error', 'Falta ID de usuario para nueva simulación.');
            return;
          }
          navigation.navigate('ImageCaptureScreen', {userId});
        }}>
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
    width: Platform.OS === 'ios' ? 340 : 320,
    height: Platform.OS === 'ios' ? 440 : 420,
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  resultImagePlaceholder: {
    width: Platform.OS === 'ios' ? 340 : 320,
    height: Platform.OS === 'ios' ? 440 : 420,
    borderRadius: 12,
    marginBottom: 15,
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
  geminiResponseText: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '90%',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
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
