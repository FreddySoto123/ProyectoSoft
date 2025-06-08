import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Importa tu RootStackParamList (idealmente desde un archivo centralizado como AuthNavigator)
import type { RootStackParamList } from './navigation/AuthNavigator'; // Ajusta la ruta si es necesario

// Define Prop types para esta screen
type BarberDashboardScreenRouteProp = RouteProp<RootStackParamList, 'BarberDashboard'>;
type BarberDashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BarberDashboard'>;

interface AppointmentForBarber {
  id: number;
  fecha: string;
  hora: string;
  nombre_cliente: string; // El backend deberá proveer esto
  servicios_nombres: string[]; // Array de nombres de servicios
  // Podrías añadir estado_cita, notas, etc.
}

interface Props {
  route: BarberDashboardScreenRouteProp;
  navigation: BarberDashboardScreenNavigationProp;
}

const BarberDashboardScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId, name: barberName } = route.params; // userId es el ID del barbero logueado
  const [appointments, setAppointments] = useState<AppointmentForBarber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      Alert.alert('Error', 'ID de barbero no disponible.');
      setLoading(false);
      return;
    }
    console.log(`BarberDashboard: Cargando citas para el barbero ID (usuario_id): ${userId}`);

    const fetchBarberAppointments = async () => {
      setLoading(true);
      setError(null);
      try {
        // Este endpoint debe devolver las citas asignadas al 'barbero_id' que es el 'usuarios.id' del barbero.
        const response = await fetch(`http://localhost:3001/api/citas/barber/${userId}`);
        const data = await response.json();

        if (response.ok) {
          console.log('Citas del barbero recibidas:', data);
          setAppointments(data);
        } else {
          console.error('Error al cargar citas del barbero:', data.error || `Status ${response.status}`);
          setError(data.error || 'No se pudieron cargar las citas.');
          Alert.alert('Error', data.error || 'No se pudieron cargar tus citas.');
        }
      } catch (e) {
        console.error('Error de red al cargar citas del barbero:', e);
        setError('Error de red al conectar con el servidor.');
        Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchBarberAppointments();
  }, [userId]);

  const handleViewProfile = () => {
    // Asegúrate que ProfileScreen reciba userId
    navigation.navigate('Profile', { userId });
  };

  const renderAppointmentItem = ({ item }: { item: AppointmentForBarber }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Cliente: {item.nombre_cliente}</Text>
      <Text style={styles.cardText}>
        Fecha: {new Date(item.fecha).toLocaleDateString()}
      </Text>
      <Text style={styles.cardText}>Hora: {item.hora.substring(0, 5)}</Text>
      {item.servicios_nombres && item.servicios_nombres.length > 0 && (
        <View style={styles.servicesContainer}>
          <Text style={styles.cardTextBold}>Servicios:</Text>
          {item.servicios_nombres.map((servicio, index) => (
            <Text key={index} style={styles.serviceItem}>- {servicio}</Text>
          ))}
        </View>
      )}
      {/* Opciones futuras: Marcar como completada, reprogramar, etc. */}
      {/* <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Gestionar Cita</Text>
        </TouchableOpacity> */}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={styles.loadingText}>Cargando tus citas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        {/* Podrías añadir un botón para reintentar el fetch */}
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F0E8" />
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Panel de Barbero</Text>
        <Text style={styles.welcomeMessage}>Bienvenido, {barberName}</Text>
        <TouchableOpacity onPress={handleViewProfile} style={styles.profileLink}>
          <Text style={styles.profileLinkText}>Ver Mi Perfil</Text>
        </TouchableOpacity>
      </View>

      {appointments.length === 0 && !loading ? (
        <View style={styles.centered}>
          <Text style={styles.infoText}>No tienes citas programadas por ahora.</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointmentItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            appointments.length > 0 ? (
              <Text style={styles.listTitle}>Tus Próximas Citas</Text>
            ) : null
          }
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F4F0E8',
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#333' },
  infoText: { fontSize: 18, color: '#555', textAlign: 'center' },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center' },
  headerContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 5 },
  welcomeMessage: { fontSize: 16, color: '#444', marginBottom: 10 },
  profileLink: { paddingVertical: 5 },
  profileLinkText: { fontSize: 15, color: '#007AFF', fontWeight: '500' },
  listContainer: { padding: 15, backgroundColor: '#F4F0E8', flexGrow: 1 },
  listTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 18,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2.5,
  },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 },
  cardText: { fontSize: 15, color: '#444', marginBottom: 4, lineHeight: 21 },
  cardTextBold: { fontSize: 15, color: '#444', fontWeight: 'bold', marginBottom: 4 },
  servicesContainer: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 8 },
  serviceItem: { fontSize: 14, color: '#555', marginLeft: 10, lineHeight: 20 },
  actionButton: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

export default BarberDashboardScreen;