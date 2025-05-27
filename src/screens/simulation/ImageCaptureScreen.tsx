import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  CameraDevice,
  PhotoFile,
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

type RootStackParamListForImageCapture = {
  ImageCaptureScreen: {userId: string};
  HairstyleSelectionScreen: {userId: string; userImageUri: string};
};
type ImageCaptureScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamListForImageCapture,
  'ImageCaptureScreen'
>;
type ImageCaptureScreenRouteProp = RouteProp<
  RootStackParamListForImageCapture,
  'ImageCaptureScreen'
>;

const ImageCaptureScreen: React.FC = () => {
  const navigation = useNavigation<ImageCaptureScreenNavigationProp>();
  const route = useRoute<ImageCaptureScreenRouteProp>();
  const isFocused = useIsFocused();
  const {userId} = route.params;

  const camera = useRef<Camera>(null);
  const availableDevices: CameraDevice[] = useCameraDevices();
  const device = React.useMemo(
    () => availableDevices.find(d => d.position === 'front'),
    [availableDevices],
  );

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const [cameraPermission, setCameraPermission] =
    useState<CameraPermissionStatus>('not-determined');
  useEffect(() => {
    const requestPerms = async () => {
      let perm = await Camera.getCameraPermissionStatus();
      if (perm === 'not-determined')
        perm = await Camera.requestCameraPermission();
      setCameraPermission(perm);
    };
    requestPerms();
  }, []);

  const handleTakePhoto = async () => {
    if (camera.current && cameraPermission === 'granted') {
      try {
        const photo = await camera.current.takePhoto({flash: 'off'});
        console.log('Foto tomada:', photo.path);
        setImageUri(`file://${photo.path}`);
        setShowCamera(false); // Volver a la vista de opciones/previa
      } catch (e) {
        console.error('Error al tomar foto:', e);
        Alert.alert('Error', 'No se pudo tomar la foto.');
      }
    } else {
      Alert.alert(
        'Cámara no lista',
        'La cámara no está lista o no tienes permisos.',
      );
    }
  };

  const handleChooseFromGallery = () => {
    launchImageLibrary(
      {mediaType: 'photo', quality: 0.8},
      (response: ImagePickerResponse) => {
        if (response.didCancel) {
          console.log('Usuario canceló la selección de galería');
        } else if (response.errorCode) {
          console.log('ImagePicker Error: ', response.errorMessage);
          Alert.alert(
            'Error',
            `No se pudo seleccionar la imagen: ${response.errorMessage}`,
          );
        } else if (response.assets && response.assets.length > 0) {
          const selectedImage = response.assets[0];
          if (selectedImage.uri) {
            console.log('Imagen seleccionada de galería:', selectedImage.uri);
            setImageUri(selectedImage.uri);
            setShowCamera(false); // Asegurarse de no mostrar la cámara
          }
        }
      },
    );
  };

  const handleNext = () => {
    if (imageUri) {
      navigation.navigate('HairstyleSelectionScreen', {
        userId,
        userImageUri: imageUri,
      });
    } else {
      Alert.alert(
        'Imagen Requerida',
        'Por favor, toma una foto o selecciona una de tu galería.',
      );
    }
  };

  if (cameraPermission === 'not-determined' && showCamera) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text> Verificando permisos...</Text>
      </View>
    );
  }
  if (cameraPermission !== 'granted' && showCamera) {
    return (
      <View style={styles.center}>
        <Text>Permiso de cámara denegado.</Text>
      </View>
    );
  }
  if (!device && showCamera) {
    return (
      <View style={styles.center}>
        <Text>Cámara frontal no disponible.</Text>
      </View>
    );
  }

  if (showCamera && isFocused) {
    return (
      <View style={styles.fullScreen}>
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device!} // Sabemos que device no es null aquí
          isActive={true}
          photo={true}
        />
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.captureBtn} onPress={handleTakePhoto}>
            {/* <Icon name="camera" size={30} color="white" /> */}
            <View style={styles.captureInnerBtn} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeCameraBtn}
            onPress={() => setShowCamera(false)}>
            {/* <Icon name="close" size={24} color="white" /> */}
            <Text style={{color: 'white'}}>X</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Prepara tu Simulación</Text>
      <Text style={styles.instructions}>
        Toma una foto clara de tu rostro o selecciona una de tu galería.
        Asegúrate de que tu rostro esté bien iluminado y mirando hacia adelante.
      </Text>

      {imageUri ? (
        <View style={styles.imagePreviewContainer}>
          <Image
            source={{uri: imageUri}}
            style={styles.imagePreview}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.changeImageButton}
            onPress={() => setImageUri(null)}>
            <Text style={styles.changeImageText}>Cambiar Imagen</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          {/* <Icon name="image-off-outline" size={80} color="#ccc" /> */}
          <Text style={styles.placeholderText}>Sin imagen seleccionada</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowCamera(true)}>
          {/* <Icon name="camera-outline" size={20} color="white" /> */}
          <Text style={styles.buttonText}>Tomar Foto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={handleChooseFromGallery}>
          {/* <Icon name="image-multiple-outline" size={20} color="white" /> */}
          <Text style={styles.buttonText}>Desde Galería</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.nextButton, !imageUri && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={!imageUri}>
        <Text style={styles.nextButtonText}>Siguiente: Elegir Corte</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  fullScreen: {flex: 1},
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f4f0e8',
  },
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  imagePreview: {width: 280, height: 280, borderRadius: 10, marginBottom: 10},
  changeImageButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  changeImageText: {color: '#333', fontSize: 14},
  placeholderContainer: {
    width: 280,
    height: 280,
    backgroundColor: '#e9e9e9',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  placeholderText: {fontSize: 16, color: '#aaa'},
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 2,
  },
  buttonText: {color: 'white', fontSize: 16, marginLeft: 8, fontWeight: '500'},
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '90%',
    alignItems: 'center',
  },
  nextButtonDisabled: {backgroundColor: '#a0a0a0'},
  nextButtonText: {color: 'white', fontSize: 18, fontWeight: 'bold'},
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    borderWidth: 3,
    borderColor: 'white',
  },
  captureInnerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
  },
  closeCameraBtn: {
    position: 'absolute',
    top: 25,
    right: 25,
    padding: 10,
  },
});

export default ImageCaptureScreen;
