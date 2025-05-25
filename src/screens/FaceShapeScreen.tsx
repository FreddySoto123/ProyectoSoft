// screens/FaceShapeScreen.tsx
import React, {useState, useEffect, useCallback} from 'react'; // Añadido useCallback
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Platform,
  Linking, // Importa Linking
  AppState, // Importa AppState
  ActivityIndicator, // Para un mejor feedback de carga
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  CameraPermissionStatus,
  CameraDevice,
} from 'react-native-vision-camera';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useIsFocused,
} from '@react-navigation/native'; // Añadido useIsFocused
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

// (Tipos FaceShapeScreenRouteParams y RootStackParamList permanecen igual)
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

const FaceShapeScreen: React.FC = () => {
  const navigation = useNavigation<FaceShapeScreenNavigationProp>();
  const route = useRoute<FaceShapeScreenRouteProp>();
  const isFocused = useIsFocused();

  const userId = route.params?.userId;
  const currentFaceShape = route.params?.currentFaceShape;

  const availableDevices: CameraDevice[] = useCameraDevices();

  // Tu línea original
  const device = React.useMemo(() => {
    console.log(
      'FACE SHAPE SCREEN - Todos los dispositivos detectados por useCameraDevices():',
      JSON.stringify(availableDevices, null, 2),
    );
    if (!availableDevices || availableDevices.length === 0) return undefined;
    const frontDevice = availableDevices.find(d => d.position === 'front');
    console.log(
      'FACE SHAPE SCREEN - Dispositivo frontal encontrado manualmente:',
      frontDevice,
    );
    return frontDevice;
  }, [availableDevices]); // Se recalcula solo si availableDevices cambia

  const [cameraPermission, setCameraPermission] =
    useState<CameraPermissionStatus>('not-determined');
  const [selectedShape, setSelectedShape] = useState<string | null>(
    currentFaceShape || null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Usamos useCallback para la función de permisos para evitar recreaciones innecesarias
  const requestCameraPermission = useCallback(async () => {
    console.log(
      'FACE SHAPE SCREEN - Verificando/Solicitando permiso de cámara...',
    );
    let permission = await Camera.getCameraPermissionStatus();
    console.log('FACE SHAPE SCREEN - Permiso de cámara actual:', permission);

    if (permission === 'not-determined') {
      console.log('FACE SHAPE SCREEN - Permiso no determinado, solicitando...');
      permission = await Camera.requestCameraPermission();
      console.log(
        'FACE SHAPE SCREEN - Permiso después de solicitar:',
        permission,
      );
    }
    setCameraPermission(permission); // Actualizar el estado del permiso

    if (permission === 'denied' || permission === 'restricted') {
      Alert.alert(
        'Permiso de Cámara Requerido',
        'BarberSmart necesita acceso a tu cámara para esta funcionalidad. Por favor, habilita el permiso en la configuración de la aplicación.',
        [
          {text: 'Cancelar', style: 'cancel'},
          {text: 'Abrir Configuración', onPress: () => Linking.openSettings()},
        ],
      );
    }
  }, []);

  useEffect(() => {
    requestCameraPermission(); // Solicitar al montar el componente

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // Volver a verificar permisos cuando la app vuelve a primer plano
        console.log('FACE SHAPE SCREEN - App activa, re-verificando permisos.');
        requestCameraPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [requestCameraPermission]);

  const handleSelectShape = (shapeId: string) => {
    setSelectedShape(shapeId);
  };

  const handleSaveChanges = async () => {
    // ... (tu lógica de handleSaveChanges permanece igual, asegúrate que userId exista) ...
    if (!selectedShape) {
      Alert.alert(
        'Selección Requerida',
        'Por favor, selecciona una forma de rostro.',
      );
      return;
    }
    if (!userId) {
      // Ya deberías tener userId de route.params
      Alert.alert('Error de Usuario', 'No se pudo identificar al usuario.');
      console.error(
        'FACE SHAPE SCREEN - userId es undefined en handleSaveChanges',
      );
      return;
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

  // Estados de renderizado basados en permisos y dispositivo
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
          Necesitas otorgar permiso a la cámara para usar esta función. Puedes
          hacerlo desde la configuración de la aplicación.
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
    // device puede ser null si no hay cámara frontal o hay un error al obtenerla
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Cámara frontal no disponible.</Text>
        <Text style={styles.permissionSubText}>
          Asegúrate de que tu dispositivo tenga una cámara frontal y no esté
          siendo usada por otra app.
        </Text>
      </View>
    );
  }

  // Renderizado principal con la cámara
  return (
    <View style={styles.container}>
      {isFocused && device && cameraPermission === 'granted' ? ( // Renderizar Camera solo si la pantalla está enfocada y todo está listo
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true} // isActive se maneja mejor con isFocused
          photo={true}
          // onError={(error) => console.error("Camera Error:", error)} // Añadir manejo de errores de cámara
        />
      ) : (
        <View style={styles.cameraPlaceholder}>
          <Text>Activando cámara...</Text>
        </View>
      )}

      <View style={styles.overlay}>
        <Text style={styles.title}>Identifica tu Forma de Rostro</Text>
        <Text style={styles.subtitle}>
          Mírate en la cámara y selecciona la forma que más se parezca.
        </Text>

        <View style={styles.shapeOverlayContainer}>
          {selectedShape && FACE_SHAPES.find(s => s.id === selectedShape) && (
            <Image
              source={FACE_SHAPES.find(s => s.id === selectedShape)!.iconUri}
              style={styles.selectedShapeImage}
              resizeMode="contain"
            />
          )}
        </View>

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
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveChanges}
          disabled={isSaving || !selectedShape}>
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Guardando...' : 'Guardar Forma'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (tus estilos que ya tenías) ...
  // Asegúrate de tener estos estilos para los nuevos estados de permiso/carga:
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraPlaceholder: {
    // Para mostrar mientras la cámara se activa
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 60 : 40, // Ajuste para safe area
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  shapeOverlayContainer: {
    width: 200,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 'auto',
    marginTop: 20,
  },
  selectedShapeImage: {
    width: '100%',
    height: '100%',
    opacity: 0.5, // Más sutil
  },
  shapesScrollView: {
    maxHeight: 150,
    width: '100%',
    paddingVertical: 10,
    flexGrow: 0, // Evitar que el ScrollView crezca demasiado si hay pocas formas
  },
  shapesContainer: {
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center', // Centrar las formas si son pocas
  },
  shapeButton: {
    alignItems: 'center',
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    width: 100,
  },
  shapeButtonSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    borderColor: '#007AFF',
  },
  shapeIcon: {
    width: 50, // Reducido para que quepa mejor el texto
    height: 70,
    marginBottom: 3,
  },
  shapeText: {
    color: 'white',
    fontSize: 12, // Más pequeño para que no se corte
    textAlign: 'center',
  },
  shapeTextSelected: {
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '90%', // Más ancho
    alignItems: 'center',
    marginTop: 15,
  },
  saveButtonDisabled: {
    backgroundColor: '#555', // Un gris más oscuro para deshabilitado
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30, // Más padding
    backgroundColor: '#e9e9ef', // Un color de fondo diferente para estas pantallas
  },
  permissionText: {
    fontSize: 20, // Más grande
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
    // Estilo para el botón de abrir configuración
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
