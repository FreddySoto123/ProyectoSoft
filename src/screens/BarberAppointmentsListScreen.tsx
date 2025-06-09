// screens/BarberAppointmentsListScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './navigation/AuthNavigator';

// Define la estructura de una cita (debe coincidir con lo que devuelve el backend)
interface AppointmentForBarber {
  id: number;
  fecha: string;
  hora: string;
  nombre_cliente: string;
  servicios_nombres: string[];
  // AJUSTA ESTO SEGÚN TU CAMPO EN LA BD: boolean o string
  // Si es boolean ('estado_de_cita'):
  estado_de_cita: boolean; // true para aceptada, false para pendiente/no aceptada
  // Si es string ('estado_cita'):
  // estado_cita: 'pendiente' | 'aceptada' | 'rechazada' | 'completada';
}

type BarberAppointmentsListRouteProp = RouteProp<RootStackParamList, 'BarberAppointmentsList'>;
type BarberAppointmentsListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BarberAppointmentsList'>;

interface Props {
  route: BarberAppointmentsListRouteProp;
  navigation: BarberAppointmentsListNavigationProp;
}

const BarberAppointmentsListScreen: React.FC<Props> = ({ route, navigation }) => {
  const { barberUserId, barberName } = route.params;
  const [appointments, setAppointments] = useState<AppointmentForBarber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AJUSTA EL TIPO Y VALOR INICIAL DEL FILTRO SEGÚN TU CAMPO 'estado_de_cita'
  // Si es boolean:
  const [filter, setFilter] = useState<boolean>(false); // false para "No Aceptadas" (estado_de_cita = false)
  // Si es string:
  // const [filter, setFilter] = useState<'pendiente' | 'aceptada'>('pendiente');

  const [refreshing, setRefreshing] = useState(false);

  // --- LOG AÑADIDO ---
  console.log('BarberAppointmentsListScreen - barberUserId recibido en params:', barberUserId);

  const fetchAppointments = useCallback(async () => {
    // --- LOG AÑADIDO ---
    console.log(`BarberAppointmentsList - INICIO fetchAppointments para barberUserId: ${barberUserId}`);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://192.168.1.210:3001/api/citas/barber/${barberUserId}`);
      const data = await response.json();

      if (response.ok) {
        // --- LOG AÑADIDO ---
        console.log('BarberAppointmentsList - Citas RAW del backend:', JSON.stringify(data, null, 2));
        setAppointments(data);
      } else {
        console.error('BarberAppointmentsList - Error al cargar citas del backend:', data.error || `Status ${response.status}`);
        setError(data.error || 'No se pudieron cargar las citas.');
      }
    } catch (e: any) {
      console.error('BarberAppointmentsList - Error de red al cargar citas:', e.message, e);
      setError('Error de red. Intenta de nuevo más tarde.'); // Mensaje más específico
    } finally {
      setLoading(false);
      setRefreshing(false);
      // --- LOG AÑADIDO ---
      console.log(`BarberAppointmentsList - FIN fetchAppointments para barberUserId: ${barberUserId}`);
    }
  }, [barberUserId]);

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [fetchAppointments])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const filteredAppointments = appointments.filter(app => {
    // AJUSTA LA LÓGICA DE FILTRADO SEGÚN TU CAMPO 'estado_de_cita'
    // --- LOG AÑADIDO ---
    console.log(`BarberAppointmentsList - Filtrando cita ID ${app.id}, estado_de_cita: ${app.estado_de_cita}, filtro actual: ${filter}`);

    // Si usas boolean para estado_de_cita:
    return app.estado_de_cita === filter;

    // Si usas string para estado_cita (ej. 'pendiente', 'aceptada'):
    // if (filter === 'pendiente') {
    //   return app.estado_cita === 'pendiente';
    // }
    // return app.estado_cita === filter;
  });

  // --- LOG AÑADIDO ---
  console.log('BarberAppointmentsList - Citas después de filtrar:', JSON.stringify(filteredAppointments, null, 2));


  const renderAppointmentItem = ({ item }: { item: AppointmentForBarber }) => (
    <TouchableOpacity
      style={styles.appointmentCard}
      onPress={() => navigation.navigate('BarberAppointmentDetail', { appointmentId: item.id, barberName })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.clientName}>{item.nombre_cliente}</Text>
      </View>
      <Text style={styles.appointmentInfo}>
        Fecha: {new Date(item.fecha).toLocaleDateString()} - Hora: {item.hora.substring(0, 5)}
      </Text>
      {item.servicios_nombres && item.servicios_nombres.length > 0 && (
        <Text style={styles.appointmentServices}>
          Servicios: {item.servicios_nombres.join(', ')}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading && !refreshing && appointments.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchAppointments} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {/* AJUSTA LA LÓGICA DE LOS BOTONES DE FILTRO SEGÚN TU CAMPO 'estado_de_cita' */}
        {/* Si es boolean: */}
        <TouchableOpacity
          style={[styles.filterButton, filter === true && styles.activeFilterButton]} // true para Aceptadas
          onPress={() => setFilter(true)}
        >
          <Text style={[styles.filterButtonText, filter === true && styles.activeFilterButtonText]}>
            Aceptadas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === false && styles.activeFilterButton]} // false para No Aceptadas
          onPress={() => setFilter(false)}
        >
          <Text style={[styles.filterButtonText, filter === false && styles.activeFilterButtonText]}>
            No Aceptadas
          </Text>
        </TouchableOpacity>

        {/* Si es string:
        <TouchableOpacity
          style={[styles.filterButton, filter === 'aceptada' && styles.activeFilterButton]}
          onPress={() => setFilter('aceptada')}
        >
          <Text style={[styles.filterButtonText, filter === 'aceptada' && styles.activeFilterButtonText]}>
            Aceptadas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pendiente' && styles.activeFilterButton]}
          onPress={() => setFilter('pendiente')}
        >
          <Text style={[styles.filterButtonText, filter === 'pendiente' && styles.activeFilterButtonText]}>
            No Aceptadas
          </Text>
        </TouchableOpacity>
        */}
      </View>

      {filteredAppointments.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.noAppointmentsText}>
            {/* AJUSTA EL MENSAJE SEGÚN TU CAMPO 'estado_de_cita' */}
            {/* Si es boolean: */}
            No hay citas {filter === false ? 'pendientes/no aceptadas' : 'aceptadas'}.
            {/* Si es string:
            No hay citas {filter === 'pendiente' ? 'pendientes' : filter + 's'}.
            */}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAppointments}
          renderItem={renderAppointmentItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A1A1A']} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: 'red', fontSize: 16, marginBottom: 10 },
  retryButton: { backgroundColor: '#1A1A1A', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 },
  retryButtonText: { color: '#fff', fontSize: 16 },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  activeFilterButton: {
    backgroundColor: '#1A1A1A',
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  listContentContainer: { padding: 15 },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  appointmentInfo: { fontSize: 14, color: '#555', marginBottom: 4 },
  appointmentServices: { fontSize: 14, color: '#555', fontStyle: 'italic' },
  noAppointmentsText: { fontSize: 16, color: '#777', textAlign: 'center', marginTop: 30 },
});

export default BarberAppointmentsListScreen;