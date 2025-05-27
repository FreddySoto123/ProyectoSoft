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
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
// import type { NativeStackNavigationProp } from '@react-navigation/native-stack'; // Si necesitas navegar desde aquí

// Define los tipos para los parámetros de ruta
type RootStackParamList = {
  SimulationResultScreen: {
    userId: string;
    userImageUri: string;
    hairstyleId: string;
    hairstyleImageUri?: string;
  };
  // ... otras rutas
};

type SimulationResultScreenRouteProp = RouteProp<
  RootStackParamList,
  'SimulationResultScreen'
>;
// type SimulationResultScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SimulationResultScreen'>;

const SimulationResultScreen: React.FC = () => {
  const navigation = useNavigation(); // Uso genérico si no hay navegación compleja desde aquí
  const route = useRoute<SimulationResultScreenRouteProp>();

  const {userId, userImageUri, hairstyleId, hairstyleImageUri} =
    route.params || {};

  const [loading, setLoading] = useState(true); // Para simular la carga de la IA
  const [generatedImageUri, setGeneratedImageUri] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userImageUri || !hairstyleId) {
      Alert.alert('Error', 'Faltan datos para la simulación.');
      setError('Datos incompletos.');
      setLoading(false);
      return;
    }

    console.log('SIMULATION RESULT SCREEN - Recibido para simulación:');
    console.log('UserId:', userId);
    console.log('User Image URI:', userImageUri);
    console.log('Hairstyle ID:', hairstyleId);
    console.log('Hairstyle Image URI (opcional):', hairstyleImageUri);

    // --- SIMULACIÓN DE LLAMADA A API DE GEMINI (A TRAVÉS DE TU BACKEND) ---
    const simulateGeneration = async () => {
      setLoading(true);
      setError(null);
      try {
        // Aquí harías la llamada a tu backend, que a su vez llama a Gemini
        // const formData = new FormData();
        // formData.append('userImage', { uri: userImageUri, name: 'user.jpg', type: 'image/jpeg' });
        // formData.append('hairstyleId', hairstyleId); // o hairstyleImage si envías la imagen del peinado
        //
        // const response = await fetch('http://localhost:3001/api/simulation/generate', {
        //   method: 'POST',
        //   body: formData,
        //   // headers: { 'Content-Type': 'multipart/form-data' } // Fetch lo maneja con FormData
        // });
        // const data = await response.json();
        //
        // if (response.ok && data.generatedImageUrl) {
        //   setGeneratedImageUri(data.generatedImageUrl);
        // } else {
        //   setError(data.error || "No se pudo generar la simulación.");
        //   Alert.alert("Error de Simulación", data.error || "No se pudo generar la simulación.");
        // }

        // *** Placeholder: Simular una carga y resultado ***
        await new Promise(resolve => setTimeout(resolve, 3000)); // Simular 3 segundos de carga
        // Usa la imagen original del usuario como placeholder del resultado por ahora
        setGeneratedImageUri(userImageUri);
        // O una imagen de resultado de prueba:
        // setGeneratedImageUri('https://via.placeholder.com/300x400.png?text=Resultado+IA');
      } catch (e) {
        console.error('Error en simulación (placeholder):', e);
        setError('Error de red al generar la simulación.');
        Alert.alert(
          'Error de Red',
          'No se pudo conectar con el servidor de simulación.',
        );
      } finally {
        setLoading(false);
      }
    };

    simulateGeneration();
  }, [userId, userImageUri, hairstyleId, hairstyleImageUri]);

  const handleSaveImage = () => {
    if (generatedImageUri) {
      // Aquí implementarías la lógica para guardar en la galería usando @react-native-community/cameraroll
      Alert.alert('Guardar', 'Funcionalidad de guardar imagen próximamente.');
      console.log('Intentando guardar imagen:', generatedImageUri);
    }
  };

  if (loading) {
    return (
      <View style={styles.containerCenter}>
        <ActivityIndicator size="large" color="#333" />
        <Text style={styles.loadingText}>Generando simulación con IA...</Text>
        <Text style={styles.loadingSubText}>
          Esto puede tardar unos segundos.
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

      {generatedImageUri ? (
        <Image
          source={{uri: generatedImageUri}}
          style={styles.resultImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.resultImagePlaceholder}>
          <Text>No se pudo generar la imagen.</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, !generatedImageUri && styles.buttonDisabled]}
        onPress={handleSaveImage}
        disabled={!generatedImageUri}>
        <Text style={styles.buttonText}>Guardar Imagen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f4f0e8',
  },
  containerCenter: {
    // Para los estados de carga/error
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
    marginBottom: 20,
  },
  resultImage: {
    width: 300,
    height: 400, // Ajusta según el aspect ratio esperado
    borderRadius: 10,
    marginBottom: 30,
    backgroundColor: '#e0e0e0',
  },
  resultImagePlaceholder: {
    width: 300,
    height: 400,
    borderRadius: 10,
    marginBottom: 30,
    backgroundColor: '#e9e9e9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '80%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 18,
    color: '#555',
    marginTop: 15,
    textAlign: 'center',
  },
  loadingSubText: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default SimulationResultScreen;
