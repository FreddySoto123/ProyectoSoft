// screens/simulation/HairstyleSelectionScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

// Define los tipos para los parámetros de ruta y navegación
type RootStackParamList = {
  HairstyleSelectionScreen: {userId: string; userImageUri: string};
  SimulationResultScreen: {
    userId: string;
    userImageUri: string;
    hairstyleId: string /* o hairstyleImageUri: string */;
  };
  // ... otras rutas que podrías tener
};

type HairstyleSelectionScreenRouteProp = RouteProp<
  RootStackParamList,
  'HairstyleSelectionScreen'
>;
type HairstyleSelectionScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'HairstyleSelectionScreen'
>;

const HairstyleSelectionScreen: React.FC = () => {
  const navigation = useNavigation<HairstyleSelectionScreenNavigationProp>();
  const route = useRoute<HairstyleSelectionScreenRouteProp>();

  const {userId, userImageUri} = route.params || {}; // Usar || {} para evitar error si params es undefined

  // Placeholder para la lista de peinados
  const hairstyles = [
    {
      id: 'style1',
      name: 'Corte Clásico',
      imageUri: 'https://via.placeholder.com/100x120.png?text=Corte+1',
    },
    {
      id: 'style2',
      name: 'Fade Moderno',
      imageUri: 'https://via.placeholder.com/100x120.png?text=Corte+2',
    },
    {
      id: 'style3',
      name: 'Pompadour',
      imageUri: 'https://via.placeholder.com/100x120.png?text=Corte+3',
    },
  ];

  const [selectedHairstyleId, setSelectedHairstyleId] = useState<string | null>(
    null,
  );

  const handleSelectHairstyle = (hairstyleId: string) => {
    setSelectedHairstyleId(hairstyleId);
    console.log(`Peinado seleccionado: ${hairstyleId}`);
  };

  const handleSimulate = () => {
    if (!userImageUri) {
      Alert.alert('Error', 'No se encontró la imagen del usuario.');
      return;
    }
    if (!selectedHairstyleId) {
      Alert.alert(
        'Selección Requerida',
        'Por favor, selecciona un estilo de corte.',
      );
      return;
    }
    console.log(
      `Simulando con imagen de usuario: ${userImageUri} y peinado ID: ${selectedHairstyleId}`,
    );
    // Navegar a la pantalla de resultados
    navigation.navigate('SimulationResultScreen', {
      userId,
      userImageUri,
      hairstyleId: selectedHairstyleId,
      // hairstyleImageUri: hairstyles.find(h => h.id === selectedHairstyleId)?.imageUri // Opcional
    });
  };

  if (!userId || !userImageUri) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Error: Faltan datos para la simulación.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.button}>
          <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona tu Corte</Text>

      <Text style={styles.infoText}>Foto del Usuario:</Text>
      <Image
        source={{uri: userImageUri}}
        style={styles.userImagePreview}
        resizeMode="contain"
      />

      <Text style={styles.infoText}>Estilos Disponibles:</Text>
      <ScrollView horizontal contentContainerStyle={styles.hairstylesContainer}>
        {hairstyles.map(style => (
          <TouchableOpacity
            key={style.id}
            style={[
              styles.hairstyleCard,
              selectedHairstyleId === style.id && styles.hairstyleCardSelected,
            ]}
            onPress={() => handleSelectHairstyle(style.id)}>
            <Image
              source={{uri: style.imageUri}}
              style={styles.hairstyleImage}
              resizeMode="cover"
            />
            <Text style={styles.hairstyleName}>{style.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, !selectedHairstyleId && styles.buttonDisabled]}
        onPress={handleSimulate}
        disabled={!selectedHairstyleId}>
        <Text style={styles.buttonText}>Simular</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f0e8',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  userImagePreview: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#e0e0e0',
  },
  hairstylesContainer: {
    paddingVertical: 10,
    marginBottom: 20,
  },
  hairstyleCard: {
    width: 120,
    marginHorizontal: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
  },
  hairstyleCardSelected: {
    borderColor: '#007AFF', // Un color para indicar selección
  },
  hairstyleImage: {
    width: 100,
    height: 100, // O la altura que necesites para tus imágenes de peinado
    borderRadius: 5,
    marginBottom: 5,
    backgroundColor: '#e0e0e0',
  },
  hairstyleName: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
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
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});

export default HairstyleSelectionScreen;
