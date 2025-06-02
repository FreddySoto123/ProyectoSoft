// screens/simulation/HairstyleSelectionScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView, // Para la lista de peinados si es larga
  FlatList, // Alternativa a ScrollView + map para listas más largas
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';

interface Hairstyle {
  // Nueva interfaz para los datos del backend
  id: number | string;
  nombre: string;
  descripcion?: string;
  foto_referencia_url?: string;
}

// ... (tus tipos de navegación) ...
type RootStackParamList = {
  HairstyleSelectionScreen: {userId: string; userImageUri: string};
  SimulationResultScreen: {
    userId: string;
    userImageUri: string;
    hairstyleId: string;
    hairstyleImageUri?: string;
  };
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

  const {userId, userImageUri} = route.params || {};

  const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]); // Estado para estilos del backend
  const [loadingStyles, setLoadingStyles] = useState(true);
  const [selectedHairstyleId, setSelectedHairstyleId] = useState<
    string | number | null
  >(null); // Puede ser number si el ID es numérico

  useEffect(() => {
    const fetchHairstyles = async () => {
      setLoadingStyles(true);
      console.log('HAIRSTYLE SELECTION - Fetching hairstyles...');
      try {
        const response = await fetch(
          'http://localhost:3001/api/styles/hairstyles',
        );
        const data = await response.json();
        if (response.ok) {
          console.log('HAIRSTYLE SELECTION - Hairstyles fetched:', data);
          setHairstyles(data);
        } else {
          Alert.alert(
            'Error',
            data.error || 'No se pudieron cargar los estilos de corte.',
          );
        }
      } catch (e) {
        Alert.alert(
          'Error de Red',
          'No se pudo conectar con el servidor para cargar estilos.',
        );
      } finally {
        setLoadingStyles(false);
      }
    };
    fetchHairstyles();
  }, []);

  const handleSelectHairstyle = (hairstyleId: string | number) => {
    setSelectedHairstyleId(hairstyleId);
  };

  const handleSimulate = () => {
    if (!userImageUri) {
      /* ... */ return;
    }
    if (!selectedHairstyleId) {
      /* ... */ return;
    }

    const selectedStyle = hairstyles.find(h => h.id === selectedHairstyleId);

    navigation.navigate('SimulationResultScreen', {
      userId,
      userImageUri,
      hairstyleId: String(selectedHairstyleId), // Asegurar que sea string si tu API lo espera así
      hairstyleImageUri: selectedStyle?.foto_referencia_url, // Pasar la URL del estilo seleccionado
    });
  };

  if (!userId || !userImageUri) {
    /* ... (tu manejo de error si faltan params) ... */
  }

  // Renderizado de la lista de peinados (puedes usar FlatList para mejor rendimiento con muchos ítems)
  const renderHairstyleItem = ({item}: {item: Hairstyle}) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.hairstyleCard,
        selectedHairstyleId === item.id && styles.hairstyleCardSelected,
      ]}
      onPress={() => handleSelectHairstyle(item.id)}>
      {item.foto_referencia_url ? (
        <Image
          source={{uri: item.foto_referencia_url}}
          style={styles.hairstyleImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.hairstyleImage, styles.hairstyleImagePlaceholder]}>
          <Text>✂️</Text>
        </View>
      )}
      <Text style={styles.hairstyleName} numberOfLines={2}>
        {item.nombre}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona tu Corte</Text>

      <Text style={styles.infoText}>Tu Foto:</Text>
      <Image
        source={{uri: userImageUri}}
        style={styles.userImagePreview}
        resizeMode="contain"
      />

      {loadingStyles ? (
        <ActivityIndicator
          size="large"
          color="#333"
          style={{marginVertical: 20}}
        />
      ) : hairstyles.length > 0 ? (
        <FlatList
          data={hairstyles}
          renderItem={renderHairstyleItem}
          keyExtractor={item => String(item.id)}
          numColumns={2} // Para un grid de 2 columnas
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.hairstylesGridContainer}
          ListHeaderComponent={
            <Text style={styles.infoText}>Estilos Disponibles:</Text>
          }
        />
      ) : (
        <Text style={styles.infoText}>
          No hay estilos de corte disponibles en este momento.
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          (!selectedHairstyleId || loadingStyles) && styles.buttonDisabled,
        ]}
        onPress={handleSimulate}
        disabled={!selectedHairstyleId || loadingStyles}>
        <Text style={styles.buttonText}>Simular</Text>
      </TouchableOpacity>
    </View>
  );
};

// Estilos (adaptados para un grid)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20, // Espacio para el header de navegación
    paddingHorizontal: 10, // Menos padding horizontal para más espacio para el grid
    backgroundColor: '#f4f0e8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoText: {fontSize: 16, color: '#555', marginBottom: 10, marginLeft: 10},
  userImagePreview: {
    width: 180, // Más grande
    height: 180,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
  },
  hairstylesGridContainer: {
    // paddingHorizontal: 5, // Espacio alrededor del grid
  },
  row: {
    // Estilo para cada fila del FlatList si numColumns > 1
    flex: 1,
    justifyContent: 'space-around',
  },
  hairstyleCard: {
    flex: 1, // Para que ocupe espacio en el grid
    maxWidth: '48%', // Para 2 columnas con espacio
    margin: 5, // Espacio entre tarjetas
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 3,
    minHeight: 180, // Para que las tarjetas tengan una altura decente
  },
  hairstyleCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  hairstyleImage: {
    width: '100%', // Ocupar todo el ancho de la tarjeta
    height: 120,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#e9e9e9',
  },
  hairstyleImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hairstyleName: {
    fontSize: 13, // Un poco más pequeño para que quepa mejor
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#000', // Negro como en tu mockup
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30, // Más redondeado
    marginTop: 15,
    marginBottom: 10, // Espacio antes del final de la pantalla
    width: '90%',
    alignSelf: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {fontSize: 16, color: 'red', textAlign: 'center'},
});

export default HairstyleSelectionScreen;
