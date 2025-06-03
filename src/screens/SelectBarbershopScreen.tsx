// screens/SelectBarbershopScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

// Define la estructura de un objeto Barbershop (ajusta según los campos que devuelvas)
interface Barbershop {
  id: number | string; // O el tipo de tu ID
  nombre: string;
  direccion?: string; // Hacer opcional si no siempre está
  logo_url?: string; // Hacer opcional
  // Añade otros campos si los necesitas directamente en la lista
}

// Define los parámetros de tu Stack de Navegación si necesitas tipado
// Esto dependerá de dónde quieras navegar después.
// Por ejemplo, si vas a una pantalla de detalle de la barbería:
type RootStackParamList = {
  // ... otras rutas ...
  SelectBarbershop: undefined;
  BarbershopDetail: {barbershopId: number | string; barbershopName: string};
  // O si vas a una pantalla para seleccionar un barbero de esa barbería:
  // SelectBarber: { barbershopId: number | string; barbershopName: string };
};

// Tipado para la prop de navegación
type SelectBarbershopScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SelectBarbershop' // Nombre de esta ruta en el navigator
>;

const SelectBarbershopScreen: React.FC = () => {
  const navigation = useNavigation<SelectBarbershopScreenNavigationProp>();
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBarbershops = async () => {
      setLoading(true);
      setError(null);
      console.log('SELECT BARBERSHOP SCREEN - Fetching barbershops...');
      try {
        const response = await fetch('http://192.168.1.202:3001/api/barbershops');
        const data = await response.json();

        if (response.ok) {
          console.log('SELECT BARBERSHOP SCREEN - Barbershops fetched:', data);
          setBarbershops(data);
        } else {
          console.error(
            'SELECT BARBERSHOP SCREEN - Error fetching barbershops (response not ok):',
            data,
          );
          setError(data.error || 'No se pudieron cargar las barberías.');
          Alert.alert(
            'Error',
            data.error || 'No se pudieron cargar las barberías.',
          );
        }
      } catch (e) {
        console.error(
          'SELECT BARBERSHOP SCREEN - Network error fetching barbershops:',
          e,
        );
        setError('Error de red al cargar las barberías.');
        Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchBarbershops();
  }, []);

  const handleSelectBarbershop = (item: Barbershop) => {
    console.log('SELECT BARBERSHOP SCREEN - Selected barbershop:', item);
    // Navega a la siguiente pantalla, pasando el ID y nombre de la barbería
    // Cambia 'BarbershopDetail' por el nombre real de tu siguiente pantalla
    navigation.navigate('BarbershopDetail', {
      // O 'SelectBarber', etc.
      barbershopId: item.id,
      barbershopName: item.nombre,
    });
  };

  const renderBarbershopItem = ({item}: {item: Barbershop}) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => handleSelectBarbershop(item)}>
      {item.logo_url ? (
        <Image
          source={{uri: item.logo_url}}
          style={styles.logo}
          onError={e =>
            console.log(
              'Error cargando logo:',
              e.nativeEvent.error,
              item.logo_url,
            )
          }
        />
      ) : (
        <View style={[styles.logo, styles.logoPlaceholder]}>
          <Text style={styles.logoPlaceholderText}>💈</Text>
        </View>
      )}
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{item.nombre}</Text>
        {item.direccion && <Text style={styles.address}>{item.direccion}</Text>}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#000" />
        <Text>Cargando barberías...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        {/* Podrías añadir un botón para reintentar */}
      </View>
    );
  }

  if (barbershops.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>No hay barberías disponibles en este momento.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona una Barbería</Text>
      <FlatList
        data={barbershops}
        renderItem={renderBarbershopItem}
        keyExtractor={item => String(item.id)} // Asegúrate de que el ID sea un string para keyExtractor
        contentContainerStyle={styles.listContentContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f5f0',
    paddingTop: 20, // Espacio para la barra de estado o header
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  listContentContainer: {
    paddingHorizontal: 15,
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2, // Sombra para Android
    shadowColor: '#000', // Sombra para iOS
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30, // Circular
    marginRight: 15,
    backgroundColor: '#e0e0e0', // Placeholder background
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 30,
  },
  infoContainer: {
    flex: 1, // Para que el texto ocupe el espacio restante
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});

export default SelectBarbershopScreen;
