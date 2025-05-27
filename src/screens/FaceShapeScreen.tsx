// screens/FaceShapeScreen.tsx
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Platform,
  Linking,
  AppState,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  CameraPermissionStatus,
  CameraDevice,
  PhotoFile,
} from 'react-native-vision-camera';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useIsFocused,
} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type FaceShapeScreenRouteParams = {
  userId: string;
  currentFaceShape?: string | null;
};

type RootStackParamList = {
  FaceShapeScreen: FaceShapeScreenRouteParams;
  // ... otras rutas
};

type FaceShapeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'FaceShapeScreen'
>;
type FaceShapeScreenRouteProp = RouteProp<
  RootStackParamList,
  'FaceShapeScreen'
>;

const FACE_SHAPES = [
  {
    id: 'oval',
    name: 'Oval',
    iconUri: require('../../assets/face_shapes/oval.png'),
  },
  {
    id: 'round',
    name: 'Redonda',
    iconUri: require('../../assets/face_shapes/round.png'),
  },
  {
    id: 'square',
    name: 'Cuadrada',
    iconUri: require('../../assets/face_shapes/square.png'),
  },
  {
    id: 'oblong',
    name: 'Alargada',
    iconUri: require('../../assets/face_shapes/oblong.png'),
  },
  {
    id: 'heart',
    name: 'Corazón',
    iconUri: require('../../assets/face_shapes/heart.png'),
  },
  {
    id: 'diamond',
    name: 'Diamante',
    iconUri: require('../../assets/face_shapes/diamond.png'),
  },
];

// --- CONFIGURACIÓN DE APIs ---
const IMGBB_API_KEY = '81fd551e66f3e290dce7e02e4f730eac'; // REEMPLAZA CON TU API KEY DE IMGBB
const FACE_SHAPE_API_URL = 'http://localhost:5000/detect_face_shape'; // AJUSTA: IP de tu PC o localhost con adb reverse
const FLASK_API_KEY =
  'eyJzdWIiOiIxMjM0NTY4ODkwIiwibmFtZSI6IkpqaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ'; // La API Key de tu servidor Flask

const FaceShapeScreen: React.FC = () => {
  const navigation = useNavigation<FaceShapeScreenNavigationProp>();
  const route = useRoute<FaceShapeScreenRouteProp>();
  const isFocused = useIsFocused();

  const userId = route.params?.userId;
  const currentFaceShapeFromParams = route.params?.currentFaceShape;

  const camera = useRef<Camera>(null);
  const availableDevices: CameraDevice[] = useCameraDevices();
  const device = React.useMemo(() => {
    if (!availableDevices || availableDevices.length === 0) return undefined;
    return availableDevices.find(d => d.position === 'front');
  }, [availableDevices]);

  const [cameraPermission, setCameraPermission] =
    useState<CameraPermissionStatus>('not-determined');
  const [selectedShape, setSelectedShape] = useState<string | null>(
    currentFaceShapeFromParams || null,
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const requestCameraPermission = useCallback(async () => {
    let permission = await Camera.getCameraPermissionStatus();
    if (permission === 'not-determined') {
      permission = await Camera.requestCameraPermission();
    }
    setCameraPermission(permission);
    const isGranted = permission === 'granted';
    if (!isGranted && permission !== 'not-determined') {
      Alert.alert(
        'Permiso de Cámara Requerido',
        'BarberSmart necesita acceso a tu cámara. Por favor, habilita el permiso en la configuración.',
        [
          {text: 'Cancelar'},
          {text: 'Abrir Configuración', onPress: () => Linking.openSettings()},
        ],
      );
    }
  }, []);

  useEffect(() => {
    requestCameraPermission();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') requestCameraPermission();
    });
    return () => subscription.remove();
  }, [requestCameraPermission]);

  const handleTakePhoto = async () => {
    if (camera.current == null) {
      Alert.alert(
        'Error',
        'La cámara no está lista o no hay dispositivo frontal.',
      );
      setIsDetecting(false);
      return;
    }
    console.log('FACE SHAPE SCREEN - Tomando foto...');
    setIsDetecting(true);
    try {
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'speed',
        flash: 'off',
        enableShutterSound: true,
      });
      console.log('FACE SHAPE SCREEN - Foto tomada, path:', photo.path);

      // Subir a ImgBB
      const imgbbFormData = new FormData();
      imgbbFormData.append('key', IMGBB_API_KEY);
      const uriParts = photo.path.split('.');
      const fileType = uriParts[uriParts.length - 1] || 'jpg';
      imgbbFormData.append('image', {
        uri: `file://${photo.path}`,
        name: `photo_for_shape_${Date.now()}.${fileType}`,
        type: `image/${fileType === 'webp' ? 'webp' : 'jpeg'}`, // Ajustar tipo si es necesario
      });

      console.log('FACE SHAPE SCREEN - Subiendo a ImgBB...');
      const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: imgbbFormData,
      });
      const imgbbData = await imgbbResponse.json();

      if (imgbbResponse.ok && imgbbData.data && imgbbData.data.url) {
        const imageUrlFromImgBB = imgbbData.data.url;
        console.log(
          'FACE SHAPE SCREEN - Foto subida a ImgBB:',
          imageUrlFromImgBB,
        );
        await detectFaceShapeWithUrl(imageUrlFromImgBB);
      } else {
        console.error(
          'FACE SHAPE SCREEN - Error al subir foto a ImgBB para detección:',
          imgbbData,
        );
        Alert.alert(
          'Error de Subida',
          `No se pudo subir la imagen para análisis: ${
            imgbbData.error?.message || 'Error ImgBB'
          }`,
        );
        setIsDetecting(false);
      }
    } catch (error) {
      console.error(
        'FACE SHAPE SCREEN - Error en handleTakePhoto o subida a ImgBB:',
        error,
      );
      Alert.alert('Error', 'Ocurrió un error al procesar la imagen.');
      setIsDetecting(false);
    }
  };

  const detectFaceShapeWithUrl = async (imageUrl: string) => {
    console.log(
      'FACE SHAPE SCREEN - Enviando URL a API Flask para detección:',
      imageUrl,
    );
    try {
      const response = await fetch(FACE_SHAPE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${FLASK_API_KEY}`,
        },
        body: JSON.stringify({image_url: imageUrl}),
      });
      const data = await response.json();
      console.log(
        'FACE SHAPE SCREEN - Respuesta de la API de detección Flask:',
        data,
      );

      if (response.ok && data.shape && data.status === 'success') {
        const detectedShapeApi = data.shape.toLowerCase();
        let detectedShapeId = detectedShapeApi
          .replace(' face', '')
          .replace('-shaped', '')
          .replace(' shaped', '')
          .trim();
        if (detectedShapeId === 'long' || detectedShapeId === 'rectangle')
          detectedShapeId = 'oblong';

        const isValidShape = FACE_SHAPES.find(s => s.id === detectedShapeId);
        if (isValidShape) {
          setSelectedShape(detectedShapeId);
          Alert.alert(
            'Forma Detectada',
            `Tu rostro parece ser de forma: ${isValidShape.name}.`,
          );
        } else {
          Alert.alert(
            'Detección Incierta',
            'No se pudo determinar la forma de tu rostro o el tipo no es reconocido. Por favor, selecciónala manualmente.',
          );
          console.warn(
            'Forma de rostro no reconocida/mapeada desde API Flask:',
            data.shape,
            'Normalizado a:',
            detectedShapeId,
          );
        }
      } else {
        Alert.alert(
          'Error de Detección',
          data.message ||
            data.error ||
            `Respuesta inesperada de la API: ${response.status}`,
        );
      }
    } catch (error) {
      console.error(
        'FACE SHAPE SCREEN - Error de red al contactar API de detección Flask:',
        error,
      );
      Alert.alert(
        'Error de Red',
        'No se pudo conectar con el servicio de detección.',
      );
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSelectShape = (shapeId: string) => {
    setSelectedShape(shapeId);
  };

  const handleSaveChanges = async () => {
    if (!selectedShape) {
      /* ... */ return;
    }
    if (!userId) {
      /* ... */ return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/auth/profile/${userId}`,
        {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({forma_rostro: selectedShape}),
        },
      );
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Éxito', 'Forma de rostro guardada correctamente.');
        navigation.goBack();
      } else {
        Alert.alert(
          'Error al Guardar',
          data.error || 'No se pudo guardar la forma del rostro.',
        );
      }
    } catch (error) {
      Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  if (cameraPermission === 'not-determined') {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#333" />
        <Text style={styles.permissionText}>
          Verificando permisos de cámara...
        </Text>
      </View>
    );
  }

  if (cameraPermission !== 'granted') {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Permiso de Cámara Denegado</Text>
        <Text style={styles.permissionSubText}>
          Habilita el permiso en la configuración de la aplicación.
        </Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => Linking.openSettings()}>
          <Text style={styles.settingsButtonText}>Abrir Configuración</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Cámara frontal no disponible.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused ? (
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          photo={true}
          onError={error => {
            console.error('Error de Componente Camera:', error);
            Alert.alert(
              'Error de Cámara',
              'Ocurrió un problema al iniciar la cámara.',
            );
          }}
        />
      ) : (
        <View style={styles.cameraPlaceholder}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={{color: '#fff', marginTop: 10}}>
            Cámara en espera...
          </Text>
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.topSection}>
          <Text style={styles.title}>Identifica tu Forma de Rostro</Text>
          <TouchableOpacity
            style={[styles.captureButton, isDetecting && styles.buttonDisabled]}
            onPress={handleTakePhoto}
            disabled={isDetecting || !isFocused}>
            {isDetecting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.captureButtonText}>Analizar mi Rostro</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.subtitle}>
            O selecciona la forma que más se parezca:
          </Text>
        </View>

        <View style={styles.shapeOverlayContainer}>
          {selectedShape && FACE_SHAPES.find(s => s.id === selectedShape) && (
            <Image
              source={FACE_SHAPES.find(s => s.id === selectedShape)!.iconUri}
              style={styles.selectedShapeImage}
              resizeMode="contain"
            />
          )}
        </View>

        <View style={styles.bottomSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.shapesScrollView}
            contentContainerStyle={styles.shapesContainer}>
            {FACE_SHAPES.map(shape => (
              <TouchableOpacity
                key={shape.id}
                style={[
                  styles.shapeButton,
                  selectedShape === shape.id && styles.shapeButtonSelected,
                ]}
                onPress={() => handleSelectShape(shape.id)}>
                <Image
                  source={shape.iconUri}
                  style={styles.shapeIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.shapeText,
                    selectedShape === shape.id && styles.shapeTextSelected,
                  ]}>
                  {shape.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (isSaving || !selectedShape) && styles.saveButtonDisabled,
            ]}
            onPress={handleSaveChanges}
            disabled={isSaving || !selectedShape}>
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Guardando...' : 'Guardar Forma'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 50 : 25,
    paddingHorizontal: 10,
  },
  topSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  captureButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 12,
    minWidth: 180,
    alignItems: 'center',
  },
  buttonDisabled: {
    // Estilo para botones deshabilitados
    backgroundColor: 'rgba(128, 128, 128, 0.7)', // Gris semitransparente
  },
  captureButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  shapeOverlayContainer: {
    width: 160,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    maxHeight: '35%',
    marginVertical: 10,
  },
  selectedShapeImage: {
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  shapesScrollView: {
    maxHeight: 120,
    width: '100%',
    paddingVertical: 5,
    flexGrow: 0,
  },
  shapesContainer: {
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shapeButton: {
    alignItems: 'center',
    marginHorizontal: 4,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    width: 80,
  },
  shapeButtonSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.7)',
    borderColor: 'rgba(0, 122, 255, 0.9)',
  },
  shapeIcon: {
    width: 40,
    height: 60,
    marginBottom: 2,
  },
  shapeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    textAlign: 'center',
  },
  shapeTextSelected: {
    fontWeight: 'bold',
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '85%',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#444',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#e9e9ef',
  },
  permissionText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    color: '#2c2c2e',
  },
  permissionSubText: {
    fontSize: 15,
    textAlign: 'center',
    color: '#3c3c43',
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: 25,
  },
  settingsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FaceShapeScreen;
