// screens/simulation/ImageCaptureScreen.tsx
import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
  ScrollView,
  AppState,
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  CameraDevice,
  PhotoFile,
  CameraPermissionStatus,
} from 'react-native-vision-camera';
import {
  launchImageLibrary,
  ImagePickerResponse,
  Asset,
} from 'react-native-image-picker';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useIsFocused,
} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

// Asegúrate de que estos tipos coincidan con tu navegador principal
type RootStackParamListForImageCapture = {
  ImageCaptureScreen: {userId: string};
  HairstyleSelectionScreen: {userId: string; userImageUri: string}; // userImageUri será la URL de ImgBB
};

type ImageCaptureScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamListForImageCapture,
  'ImageCaptureScreen'
>;
type ImageCaptureScreenRouteProp = RouteProp<
  RootStackParamListForImageCapture,
  'ImageCaptureScreen'
>;

const IMGBB_API_KEY = '81fd551e66f3e290dce7e02e4f730eac'; // <-- REEMPLAZA CON TU API KEY DE IMGBB

const ImageCaptureScreen: React.FC = () => {
  const navigation = useNavigation<ImageCaptureScreenNavigationProp>();
  const route = useRoute<ImageCaptureScreenRouteProp>();
  const isFocused = useIsFocused(); // Para activar/desactivar la cámara
  const {userId} = route.params || {};

  const camera = useRef<Camera>(null);
  const availableDevices: CameraDevice[] = useCameraDevices();
  const device = React.useMemo(
    () => availableDevices.find(d => d.position === 'front'),
    [availableDevices],
  );

  const [localImageUri, setLocalImageUri] = useState<string | null>(null); // URI local de la imagen
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Para subida a ImgBB y navegación

  const [cameraPermission, setCameraPermission] =
    useState<CameraPermissionStatus>('not-determined');

  const requestCameraPermission = useCallback(async () => {
    let permission = await Camera.getCameraPermissionStatus();
    if (permission === 'not-determined') {
      permission = await Camera.requestCameraPermission();
    }
    setCameraPermission(permission);
    if (permission !== 'granted' && permission !== 'not-determined') {
      Alert.alert(
        'Permiso de Cámara Requerido',
        'Se necesita acceso a la cámara para tomar una foto. Habilítalo en la configuración.',
        [
          {text: 'Cancelar'},
          {text: 'Abrir Configuración', onPress: () => Linking.openSettings()},
        ],
      );
    }
  }, []);

  useEffect(() => {
    if (showCamera) {
      // Solo pedir/verificar permiso si vamos a mostrar la cámara
      requestCameraPermission();
    }
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && showCamera) {
        requestCameraPermission();
      }
    });
    return () => subscription.remove();
  }, [requestCameraPermission, showCamera]);

  const handleTakePhoto = async () => {
    if (camera.current && cameraPermission === 'granted') {
      setIsProcessing(true);
      try {
        const photo = await camera.current.takePhoto({flash: 'off'});
        console.log('IMAGE CAPTURE - Foto tomada:', photo.path);
        setLocalImageUri(`file://${photo.path}`);
        setShowCamera(false);
      } catch (e) {
        console.error('IMAGE CAPTURE - Error al tomar foto:', e);
        Alert.alert('Error', 'No se pudo tomar la foto.');
      } finally {
        setIsProcessing(false);
      }
    } else {
      Alert.alert(
        'Cámara no lista',
        'La cámara no está lista o no tienes permisos.',
      );
    }
  };

  const handleChooseFromGallery = () => {
    setIsProcessing(true);
    launchImageLibrary(
      {mediaType: 'photo', quality: 0.8},
      (response: ImagePickerResponse) => {
        setIsProcessing(false);
        if (response.didCancel) {
          /* ... */
        } else if (response.errorCode) {
          /* ... */ Alert.alert(
            'Error',
            `No se pudo seleccionar: ${response.errorMessage}`,
          );
        } else if (
          response.assets &&
          response.assets.length > 0 &&
          response.assets[0].uri
        ) {
          console.log(
            'IMAGE CAPTURE - Imagen de galería:',
            response.assets[0].uri,
          );
          setLocalImageUri(response.assets[0].uri);
          setShowCamera(false);
        }
      },
    );
  };

  const uploadToImgBBAndProceed = async () => {
    if (!localImageUri) return;
    if (!userId) {
      Alert.alert('Error', 'Falta ID de usuario.');
      return;
    }

    setIsProcessing(true);
    console.log('IMAGE CAPTURE - Subiendo a ImgBB:', localImageUri);
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    const uriParts = localImageUri.split('.');
    const fileType = uriParts[uriParts.length - 1] || 'jpg';
    formData.append('image', {
      uri:
        Platform.OS === 'android'
          ? localImageUri
          : localImageUri.replace('file://', ''),
      name: `user_photo_${userId}_${Date.now()}.${fileType}`,
      type: `image/${fileType.toLowerCase() === 'png' ? 'png' : 'jpeg'}`, // Ajustar tipo MIME
    });

    try {
      const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });
      const imgbbData = await imgbbResponse.json();

      if (imgbbResponse.ok && imgbbData.data && imgbbData.data.url) {
        const userImagePublicUrl = imgbbData.data.url;
        console.log(
          'IMAGE CAPTURE - Imagen subida a ImgBB:',
          userImagePublicUrl,
        );
        navigation.navigate('HairstyleSelectionScreen', {
          userId,
          userImageUri: userImagePublicUrl,
        });
      } else {
        Alert.alert(
          'Error de Subida',
          `No se pudo subir tu imagen: ${
            imgbbData.error?.message || 'Error desconocido de ImgBB'
          }`,
        );
      }
    } catch (error) {
      Alert.alert('Error de Red', 'No se pudo subir tu imagen a ImgBB.');
      console.error('Error de red subiendo a ImgBB:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (showCamera) {
    if (cameraPermission === 'not-determined') {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.centerText}> Verificando permisos...</Text>
        </View>
      );
    }
    if (cameraPermission !== 'granted') {
      return (
        <View style={styles.center}>
          <Text style={styles.centerText}>Permiso de cámara denegado.</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openSettings()}>
            <Text style={styles.actionButtonText}>Abrir Configuración</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowCamera(false)}>
            <Text style={styles.actionButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!device) {
      return (
        <View style={styles.center}>
          <Text style={styles.centerText}>Cámara frontal no disponible.</Text>
        </View>
      );
    }
    if (!isFocused) {
      // No renderizar la cámara si la pantalla no está enfocada
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.centerText}> Preparando cámara...</Text>
        </View>
      );
    }

    return (
      <View style={styles.fullScreen}>
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true} // isFocused ya se verifica arriba
          photo={true}
          onError={e => {
            console.error('Error componente Camera:', e);
            Alert.alert('Error Cámara', 'No se pudo iniciar la cámara.');
          }}
        />
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={handleTakePhoto}
            disabled={isProcessing}>
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={styles.captureInnerBtn} />
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.closeCameraBtn}
          onPress={() => setShowCamera(false)}>
          <Text style={styles.closeCameraText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Pantalla principal de ImageCaptureScreen
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Prepara tu Simulación</Text>
      <Text style={styles.instructions}>
        Toma una foto clara de tu rostro o selecciona una de tu galería.
        Asegúrate de que tu rostro esté bien iluminado y mirando hacia adelante.
      </Text>

      {localImageUri ? (
        <View style={styles.imagePreviewContainer}>
          <Image
            source={{uri: localImageUri}}
            style={styles.imagePreview}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.changeImageButton}
            onPress={() => {
              setLocalImageUri(null); /* setShowCamera(true); opcional */
            }}>
            <Text style={styles.changeImageText}>Cambiar Imagen</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderIcon}>📷</Text>
          <Text style={styles.placeholderText}>Toma o selecciona una foto</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isProcessing && styles.buttonDisabled]}
          onPress={() => setShowCamera(true)}
          disabled={isProcessing}>
          <Text style={styles.buttonText}>Tomar Foto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, isProcessing && styles.buttonDisabled]}
          onPress={handleChooseFromGallery}
          disabled={isProcessing}>
          <Text style={styles.buttonText}>Desde Galería</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.nextButton,
          (!localImageUri || isProcessing) && styles.nextButtonDisabled,
        ]}
        onPress={uploadToImgBBAndProceed} // Ahora llama a la función de subida
        disabled={!localImageUri || isProcessing}>
        {isProcessing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.nextButtonText}>Siguiente: Elegir Corte</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  fullScreen: {flex: 1, backgroundColor: 'black'},
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start', // Alinea al inicio para que el scroll funcione bien
    padding: 20,
    paddingTop: 30,
    backgroundColor: '#f4f0e8',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f4f0e8',
  },
  centerText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fff',
    width: 300, // Ancho fijo para consistencia
    height: 340, // Alto fijo
    justifyContent: 'space-between',
  },
  imagePreview: {
    width: 280, // Ancho dentro del padding
    height: 280, // Alto
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  changeImageButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 5,
  },
  changeImageText: {color: '#333', fontSize: 14, fontWeight: '500'},
  placeholderContainer: {
    width: 300,
    height: 340,
    backgroundColor: '#e9e9e9',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  placeholderIcon: {
    fontSize: 60,
    color: '#bbb',
    marginBottom: 10,
  },
  placeholderText: {fontSize: 16, color: '#aaa'},
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 25,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A4A4A', // Un gris más oscuro
    paddingVertical: 12,
    paddingHorizontal: 18, // Ajustado
    borderRadius: 25,
    elevation: 2,
    minWidth: 140, // Ancho mínimo
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {color: 'white', fontSize: 15, fontWeight: '500'}, // Reducido el texto del botón
  nextButton: {
    backgroundColor: '#222',
    paddingVertical: 15,
    borderRadius: 25,
    width: '95%', // Ligeramente más ancho
    alignItems: 'center',
    elevation: 2,
  },
  nextButtonDisabled: {backgroundColor: '#929292'}, // Un azul más claro para deshabilitado
  nextButtonText: {color: 'white', fontSize: 17, fontWeight: 'bold'},
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4, // Más grueso
    borderColor: 'white',
  },
  captureInnerBtn: {
    width: 58, // Ligeramente más pequeño
    height: 58,
    borderRadius: 29,
    backgroundColor: 'white',
  },
  closeCameraBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20, // Ajustar para safe area / status bar
    left: 20, // Movido a la izquierda
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  closeCameraText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButton: {
    // Botones en la pantalla de permiso denegado
    backgroundColor: '#222',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ImageCaptureScreen;
