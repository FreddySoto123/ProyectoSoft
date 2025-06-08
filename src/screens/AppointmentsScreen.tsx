// AppointmentsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar, // Added for consistency if you style StatusBar per screen
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Assuming RootStackParamList is exported from your AuthNavigator or a central types file
// Adjust the path accordingly based on your project structure.
// For example, if AuthNavigator.tsx is in ../navigation/AuthNavigator.tsx:
import type { RootStackParamList } from '../screens/navigation/AuthNavigator';
// Or if you have it in a global types file, e.g., ../types/navigation.ts:
// import type { RootStackParamList } from '../types/navigation';

// Define Prop types for this screen
type AppointmentsScreenRouteProp = RouteProp<RootStackParamList, 'AppointmentsScreen'>;
type AppointmentsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AppointmentsScreen'>;

interface Appointment {
  id: number;
  fecha: string;
  hora: string;
  nombre_barberia: string;
  nombre_barbero: string;
  servicios: string[]; // Array of service names
}

interface Props {
  route: AppointmentsScreenRouteProp;
  navigation: AppointmentsScreenNavigationProp; // Kept for potential future use
}

const AppointmentsScreen: React.FC<Props> = ({ route, navigation }) => {
  // console.log('AppointmentsScreen - route.params:', route.params); // For debugging
  const userId = route.params?.userId; // Can be number, string, or null (from initialParams)

  const [citas, setCitas] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure userId is a valid value (not null, undefined, 0, or empty string)
    // User IDs are typically positive numbers or non-empty strings.
    if (!userId) {
      Alert.alert('Error', 'ID de usuario no válido o no proporcionado.');
      console.warn('AppointmentsScreen: useEffect - userId is invalid:', userId);
      setLoading(false);
      setCitas([]); // Clear any existing citas if userId becomes invalid
      return;
    }

    const fetchCitas = async () => {
      setLoading(true); // Set loading true at the start of fetch
      try {
        // Replace with your actual API endpoint if different, or use an env variable
        const response = await fetch(`http://localhost:3001/api/citas/user/${userId}`);
        const data = await response.json();

        if (response.ok) {
          setCitas(data);
        } else {
          // data.error comes from the backend's JSON response on error
          console.error('Error fetching citas:', data.error || `Status ${response.status}`);
          Alert.alert('Error', data.error || 'No se pudieron cargar tus citas.');
          setCitas([]); // Clear citas on error
        }
      } catch (error) {
        console.error('Network error fetching citas:', error);
        Alert.alert('Error de Red', 'No se pudo conectar al servidor para obtener tus citas.');
        setCitas([]); // Clear citas on network error
      } finally {
        setLoading(false);
      }
    };

    fetchCitas();
  }, [userId]); // Re-run effect if userId changes

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={styles.loadingText}>Cargando tus citas...</Text>
      </View>
    );
  }

  if (!userId) { // This case should ideally be caught by the useEffect guard, but kept as a fallback UI
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>No se pudo identificar al usuario para cargar las citas.</Text>
      </View>
    );
  }

  if (citas.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>No tienes citas programadas.</Text>
        {/* Optionally, add a button to schedule a new appointment */}
        {/* <TouchableOpacity onPress={() => navigation.navigate('SelectBarbershop')}>
            <Text style={styles.buttonText}>Agendar una Cita</Text>
          </TouchableOpacity> */}
      </View>
    );
  }

  const renderItem = ({ item }: { item: Appointment }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.nombre_barberia}</Text>
      <Text style={styles.cardText}>
        Fecha: {new Date(item.fecha).toLocaleDateString()} {/* Format date for better readability */}
      </Text>
      <Text style={styles.cardText}>Hora: {item.hora}</Text>
      <Text style={styles.cardText}>Barbero: {item.nombre_barbero}</Text>
      {item.servicios && item.servicios.length > 0 && (
        <View style={styles.servicesContainer}>
          <Text style={styles.cardTextBold}>Servicios:</Text>
          {item.servicios.map((servicio, index) => (
            <Text key={index} style={styles.serviceItem}>- {servicio}</Text>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F0E8" />
      <FlatList
        data={citas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F4F0E8', // Match background with list
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  infoText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
  },
  listContainer: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F4F0E8',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 15,
    color: '#444',
    marginBottom: 4,
    lineHeight: 22,
  },
  cardTextBold: {
    fontSize: 15,
    color: '#444',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  servicesContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 8,
  },
  serviceItem: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
    lineHeight: 20,
  },
  // Optional: Button style if you add a "Schedule Appointment" button
  // buttonText: {
  //   marginTop: 20,
  //   fontSize: 16,
  //   color: '#007AFF', // Example button color
  //   fontWeight: 'bold',
  // },
});

export default AppointmentsScreen; 