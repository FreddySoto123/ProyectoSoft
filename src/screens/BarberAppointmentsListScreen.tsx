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
  RefreshControl,
  Image // Asegúrate que Image esté importado
} from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './navigation/AuthNavigator'; // Ajusta la ruta

// Tipos de estado que el barbero manejará en sus filtros.
// 'Rechazada_barbero' es el estado cuando el barbero rechaza.
// 'Cancelada_cliente' es cuando el cliente cancela.
type FilterableBarberStatus = 'Pendiente' | 'Aceptada' | 'Rechazada_barbero' | 'Completada' | 'Cancelada_cliente';

interface AppointmentForBarber {
  id: number;
  fecha: string;
  hora: string;
  nombre_cliente: string;
  servicios_nombres: string[];
  estado_de_cita: string; // Recibirá strings como "Pendiente", "Aceptada", etc.
  notas_cliente?: string;
  precio_total?: number;
  avatar_cliente?: string;
}

type BarberAppointmentsListRouteProp = RouteProp<RootStackParamList, 'BarberAppointmentsList'>;
type BarberAppointmentsListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BarberAppointmentsList'>;

interface Props {
  route: BarberAppointmentsListRouteProp;
  navigation: BarberAppointmentsListNavigationProp;
}

const formatStatusForBarberList = (status: string): string => {
  if (!status) return 'Desconocido';
  const s = status.toLowerCase();
  switch (s) {
    case 'pendiente': return 'Pendiente';
    case 'aceptada': return 'Aceptada';
    case 'rechazada_barbero': return 'Rechazada';
    case 'completada': return 'Completada';
    case 'cancelada_cliente': return 'Cancelada (Cliente)';
    case 'true': return 'Aceptada';
    case 'false': return 'Pendiente';
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

const getStatusStyleForList = (status: string | undefined | null) => {
  if (!status) return styles.statusDefault;
  const s = status.toLowerCase();
  switch (s) {
    case 'pendiente': case 'false': return styles.statusPending;
    case 'aceptada': case 'true': return styles.statusAccepted;
    case 'rechazada_barbero': return styles.statusRejected;
    case 'completada': return styles.statusCompleted;
    case 'cancelada_cliente': return styles.statusCancelled;
    default: return styles.statusDefault;
  }
};


const BarberAppointmentsListScreen: React.FC<Props> = ({ route, navigation }) => {
  const { barberUserId, barberName } = route.params;
  const [appointments, setAppointments] = useState<AppointmentForBarber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterableBarberStatus>('Pendiente'); // Filtro inicial
  const [refreshing, setRefreshing] = useState(false);

  console.log('BarberAppointmentsListScreen - barberUserId recibido:', barberUserId);

  const fetchAppointments = useCallback(async () => {
    // ... (lógica de fetchAppointments como la tenías) ...
    console.log(`BarberAppointmentsList: Fetching para barberUserId: ${barberUserId}, Filtro actual: ${filter}`);
    if (!refreshing) setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://192.168.1.210:3001/api/citas/barber/${barberUserId}`);
      const responseText = await response.text();
      let data;
      try { data = JSON.parse(responseText); } catch (e) { /* ... */ console.error("Error parseando JSON en Lista Barbero", e); return; }
      console.log('BarberAppointmentsList - Citas RAW del backend:', JSON.stringify(data, null, 2));
      if (response.ok && Array.isArray(data)) {
        setAppointments(data);
      } else { /* ... */ }
    } catch (e) { /* ... */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [barberUserId, refreshing]); // 'filter' no necesita estar aquí ya que el filtrado es en frontend

  useFocusEffect(useCallback(() => { fetchAppointments(); }, [fetchAppointments]));
  const onRefresh = () => { setRefreshing(true); };

  const filteredAppointments = appointments.filter(app => {
    if (!app.estado_de_cita) return false;
    const currentStatus = app.estado_de_cita.toLowerCase();
    // Comparamos el estado actual de la cita (en minúsculas) con el filtro (también en minúsculas)
    return currentStatus === filter.toLowerCase();
  });
  console.log(`BarberAppointmentsList - Filtro: '${filter}'. Citas filtradas: ${filteredAppointments.length}`);

  const renderAppointmentItem = ({ item }: { item: AppointmentForBarber }) => (
    <TouchableOpacity
      style={styles.appointmentCard}
      onPress={() => navigation.navigate('BarberAppointmentDetail', { appointmentId: item.id, barberName })}
    >
      <View style={styles.cardHeaderRow}>
        {item.avatar_cliente ? (
            <Image source={{uri: item.avatar_cliente}} style={styles.clientAvatarMini} />
        ) : (
            <View style={styles.avatarPlaceholderMini}><Text style={styles.avatarPlaceholderTextMini}>👤</Text></View>
        )}
        <Text style={styles.clientName}>{item.nombre_cliente || 'Cliente Desconocido'}</Text>
      </View>
      <Text style={styles.appointmentInfo}>
        Fecha: {item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES', {day:'2-digit', month:'short'}) : 'N/A'} - Hora: {item.hora ? item.hora.substring(0, 5) : 'N/A'}
      </Text>
      {item.servicios_nombres && item.servicios_nombres.length > 0 && (
        <Text style={styles.appointmentServices} numberOfLines={1}>
          Servicios: {item.servicios_nombres.join(', ')}
        </Text>
      )}
       <View style={[styles.statusBadge, getStatusStyleForList(item.estado_de_cita)]}>
          <Text style={styles.statusTextList}>{formatStatusForBarberList(item.estado_de_cita)}</Text>
        </View>
    </TouchableOpacity>
  );

  // ... (estados de loading, error, etc.) ...
  if (loading && !refreshing && appointments.length === 0 && !error) { /* ... */ }
  if (error && appointments.length === 0) { /* ... */ }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {(['Pendiente', 'Aceptada', 'Rechazada_barbero', 'Completada', 'Cancelada_cliente'] as FilterableBarberStatus[]).map(statusValue => (
          <TouchableOpacity
            key={statusValue}
            style={[styles.filterButton, filter === statusValue && styles.activeFilterButton]}
            onPress={() => setFilter(statusValue)}
          >
            <Text style={[styles.filterButtonText, filter === statusValue && styles.activeFilterButtonText]}>
              {/* Formatear el texto del botón para que sea más legible */}
              {statusValue === 'Rechazada_barbero' ? 'Rechazadas' :
               statusValue === 'Cancelada_cliente' ? 'Cancel. Cliente' :
               statusValue}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredAppointments.length === 0 && !loading ? (
        <View style={styles.centered}>
          <Text style={styles.noAppointmentsText}>
            No hay citas para el filtro "{filter === 'Rechazada_barbero' ? 'Rechazadas' : filter === 'Cancelada_cliente' ? 'Cancel. Cliente' : filter}".
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
  // ... (tus estilos existentes) ...
  // Asegúrate de tener estilos para todos los estados en getStatusStyleForList:
  // statusPending, statusAccepted, statusRejected, statusCompleted, statusCancelled, statusDefault
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  filterContainer: {
    flexDirection: 'row',
    paddingVertical: 8, // Un poco menos de padding vertical
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 5,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8, // Un poco menos de padding vertical
    borderRadius: 18, // Un poco menos redondeado
    backgroundColor: '#e9e9e9', // Un gris más claro para inactivo
    marginHorizontal: 3, // Menos espacio entre botones
    alignItems: 'center',
    justifyContent: 'center', // Centrar el texto verticalmente
    minHeight: 38, // Alto mínimo
  },
  activeFilterButton: {
    backgroundColor: '#333', // Un negro más suave
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 11, // Texto más pequeño para que quepan más botones
    fontWeight: '600',
    color: '#444',
    textAlign: 'center', // Asegurar centrado
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  listContentContainer: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 15 },
  appointmentCard: { /* ... */ },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  clientAvatarMini: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#e0e0e0' },
  avatarPlaceholderMini: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholderTextMini: { fontSize: 20, color: '#aaa' },
  clientName: { fontSize: 17, fontWeight: 'bold', color: '#333', flexShrink: 1 },
  appointmentInfo: { fontSize: 14, color: '#555', marginBottom: 4 },
  appointmentServices: { fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 8 },
  noAppointmentsText: { fontSize: 16, color: '#777', textAlign: 'center', marginTop: 30 },
  statusBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, alignSelf: 'flex-start', marginTop: 5, marginBottom: 3 },
  statusTextList: { fontSize: 11, fontWeight: 'bold', color: '#FFFFFF' },
  statusPending:    { backgroundColor: '#f39c12' },
  statusAccepted:   { backgroundColor: '#2ecc71' },
  statusRejected:   { backgroundColor: '#e74c3c' },
  statusCompleted:  { backgroundColor: '#3498db' },
  statusCancelled:  { backgroundColor: '#95a5a6' }, // Estilo para citas canceladas por cliente
  statusDefault:    { backgroundColor: '#bdc3c7' },
  // Estilos para error y reintento
  errorTextTitle: { fontSize: 20, fontWeight: 'bold', color: 'red', textAlign: 'center', marginBottom: 10, },
  errorTextMessage: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 20, },
  retryButton: { backgroundColor: '#1A1A1A', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 8, },
  retryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', },
});

export default BarberAppointmentsListScreen;