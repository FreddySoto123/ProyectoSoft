// AppointmentsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../screens/navigation/AuthNavigator'; // Ajusta la ruta
import AsyncStorage from '@react-native-async-storage/async-storage'; // Para obtener el token

// Asegúrate que la IP y puerto son los correctos de tu backend
const API_BASE_URL = 'http://192.168.1.210:3001';

type AppointmentsScreenRouteProp = RouteProp<RootStackParamList, 'AppointmentsScreen'>;
type AppointmentsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AppointmentsScreen'>;

interface Appointment {
  id: number;
  fecha: string;
  hora: string;
  nombre_barberia: string;
  nombre_barbero: string;
  servicios: string[];
  estado_de_cita: string; // Se espera string como "Pendiente", "Aceptada", etc.
  precio_total?: number;
  notas_cliente?: string;
}

interface Props {
  route: AppointmentsScreenRouteProp;
  navigation: AppointmentsScreenNavigationProp;
}

const formatAppointmentStatusForClient = (status: string | undefined | null): string => {
  if (!status) return 'Desconocido';
  const s = status.toLowerCase();
  switch (s) {
    case 'pendiente': return 'Pendiente de Confirmación';
    case 'aceptada': return 'Aceptada por Barbero';
    case 'rechazada_barbero': return 'Rechazada por Barbero';
    case 'completada': return 'Completada';
    case 'cancelada_cliente': return 'Cancelada por Ti';
    case 'true': return 'Aceptada por Barbero'; // Fallback
    case 'false': return 'Pendiente de Confirmación'; // Fallback
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

const getStatusStyleForClient = (status: string | undefined | null) => {
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

const AppointmentsScreen: React.FC<Props> = ({ route, navigation }) => {
  const userId = route.params?.userId;
  const [citas, setCitas] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updatingCitaId, setUpdatingCitaId] = useState<number | null>(null);

  const fetchCitas = useCallback(async () => {
    if (!userId) {
      Alert.alert('Error', 'ID de usuario no válido.');
      console.warn('AppointmentsScreen: userId no válido:', userId);
      setLoading(false); setRefreshing(false); setCitas([]); setFetchError('ID de usuario no válido.');
      return;
    }
    console.log('AppointmentsScreen: Fetching citas para userId:', userId);
    if (!refreshing) setLoading(true);
    setFetchError(null);

    try {
      // --- SIMULACIÓN DE AUTENTICACIÓN PARA PRUEBAS ---
      // En un sistema real, el token se enviaría en los headers
      // y el backend lo usaría para identificar al usuario.
      // Aquí, para que el endpoint de cancelación funcione con la simulación
      // del backend, podríamos necesitar enviar el userId en el header si tu
      // middleware de backend lo espera (como el x-user-id de ejemplo).
      // Por ahora, el GET no lo necesita si el :userId en la URL es suficiente.
      const token = await AsyncStorage.getItem('@user_token'); // Opcional, para enviar si el backend lo requiere

      const response = await fetch(`${API_BASE_URL}/api/citas/user/${userId}`, {
        headers: {
          // Si tu backend espera un token para esta ruta:
          // 'Authorization': `Bearer ${token}`,
          // Si tu middleware de simulación de backend espera 'x-user-id':
          'x-user-id': String(userId) // Solo si tu middleware de simulación lo usa
        }
      });
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('AppointmentsScreen: Citas recibidas (RAW data):', JSON.stringify(data, null, 2));
      } catch (jsonError: any) {
        console.error('AppointmentsScreen: Error parseando JSON:', jsonError.message, "\nRespuesta:", responseText.substring(0,500));
        Alert.alert('Error de Formato', `Respuesta inesperada. Status: ${response.status}`);
        setCitas([]); setFetchError('Error de formato del servidor.');
        setLoading(false); setRefreshing(false); return;
      }

      if (response.ok) {
        if (Array.isArray(data)) {
          setCitas(data);
        } else {
          Alert.alert('Error de Datos', 'Formato de datos incorrecto.');
          setCitas([]); setFetchError('Formato de datos incorrecto.');
        }
      } else {
        const errorMessage = data?.error || `Error ${response.status}.`;
        Alert.alert('Error', errorMessage);
        setCitas([]); setFetchError(errorMessage);
      }
    } catch (error: any) {
      Alert.alert('Error de Red', 'No se pudo conectar al servidor.');
      setCitas([]); setFetchError('Error de red.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, refreshing]);

  useFocusEffect(useCallback(() => { fetchCitas(); }, [fetchCitas]));
  const onRefresh = () => { setRefreshing(true); };

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!userId) { // Verificación adicional
        Alert.alert("Error", "No se pudo identificar al usuario.");
        return;
    }
    Alert.alert(
      "Confirmar Cancelación",
      "¿Estás seguro de que quieres cancelar esta cita?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí, Cancelar",
          onPress: async () => {
            setUpdatingCitaId(appointmentId);
            try {
              const token = await AsyncStorage.getItem('@user_token'); // Para autenticación real
              const response = await fetch(`${API_BASE_URL}/api/citas/${appointmentId}/cancelar-cliente`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  // Para el middleware de simulación que te di, necesitarías el header x-user-id:
                  'x-user-id': String(userId), // Asegúrate que tu middleware de backend lo use
                  // Para autenticación JWT real:
                  // 'Authorization': `Bearer ${token}`,
                },
              });
              const data = await response.json();

              if (response.ok && data.cita) {
                Alert.alert('Éxito', data.message || 'Tu cita ha sido cancelada.');
                setCitas(prevCitas =>
                  prevCitas.map(c =>
                    c.id === appointmentId ? { ...c, estado_de_cita: data.cita.estado_de_cita } : c
                  )
                );
              } else {
                Alert.alert('Error', data.error || 'No se pudo cancelar la cita.');
              }
            } catch (error: any) {
              console.error("AppointmentsScreen: Error cancelando cita:", error.message);
              Alert.alert('Error de Red', 'No se pudo conectar para cancelar la cita.');
            } finally {
              setUpdatingCitaId(null);
            }
          },
          style: "destructive",
        },
      ]
    );
  };


  if (loading && !refreshing && citas.length === 0 && !fetchError) { /* ... ActivityIndicator ... */ }
  if (fetchError && citas.length === 0) { /* ... Mensaje de Error con botón Reintentar ... */ }
  if (!userId && !loading && !fetchError) { /* ... Mensaje de !userId ... */ }
  if (citas.length === 0 && !loading && !fetchError) { /* ... Mensaje de no hay citas con botón Agendar ... */ }
  // Código de los if anteriores
  if (loading && !refreshing && citas.length === 0 && !fetchError) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={styles.loadingText}>Cargando tus citas...</Text>
      </View>
    );
  }
  if (fetchError && citas.length === 0) {
      return (
          <View style={styles.centered}>
              <Text style={styles.errorTextTitle}>Error al Cargar</Text>
              <Text style={styles.errorTextMessage}>{fetchError}</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
          </View>
      );
  }
  if (!userId && !loading && !fetchError) {
    return ( <View style={styles.centered}><Text style={styles.infoText}>ID de usuario no disponible.</Text></View> );
  }
  if (citas.length === 0 && !loading && !fetchError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>No tienes citas programadas.</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SelectBarbershop')} style={styles.scheduleButton}>
            <Text style={styles.scheduleButtonText}>Agendar una Cita</Text>
        </TouchableOpacity>
      </View>
    );
  }


  const renderItem = ({ item }: { item: Appointment }) => {
    const canCancel = item.estado_de_cita?.toLowerCase() === 'pendiente' || item.estado_de_cita?.toLowerCase() === 'aceptada';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{item.nombre_barberia || 'Barbería Desconocida'}</Text>
          {item.estado_de_cita && (
              <View style={[styles.statusBadge, getStatusStyleForClient(item.estado_de_cita)]}>
              <Text style={styles.statusText}>{formatAppointmentStatusForClient(item.estado_de_cita)}</Text>
              </View>
          )}
        </View>
        <Text style={styles.cardText}>Barbero: {item.nombre_barbero || 'N/A'}</Text>
        <Text style={styles.cardText}>
          Fecha: {item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Fecha no disponible'}
        </Text>
        <Text style={styles.cardText}>Hora: {item.hora ? item.hora.substring(0,5) : 'Hora no disponible'}</Text>

        {item.servicios && Array.isArray(item.servicios) && item.servicios.length > 0 && (
          <View style={styles.servicesContainer}>
            <Text style={styles.cardTextBold}>Servicios:</Text>
            {item.servicios.map((servicio, index) => (
              <Text key={index} style={styles.serviceItem}>- {typeof servicio === 'string' ? servicio : 'Servicio'}</Text>
            ))}
          </View>
        )}
        {item.precio_total != null && (
          <Text style={styles.priceText}>Precio Total: Bs {Number(item.precio_total).toFixed(2)}</Text>
        )}
        {item.notas_cliente && item.notas_cliente.toLowerCase() !== 'sin notas.' && (
          <View style={styles.notesContainer}>
              <Text style={styles.cardTextBold}>Tus Notas:</Text>
              <Text style={styles.notesTextContent}>{item.notas_cliente}</Text>
          </View>
        )}

        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelAppointment(item.id)}
            disabled={updatingCitaId === item.id}
          >
            {updatingCitaId === item.id ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancelar Cita</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F0E8" />
      <FlatList
        data={citas}
        keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1A1A1A"]} />
        }
      />
    </>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F4F0E8' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#333' },
  infoText: { fontSize: 18, color: '#555', textAlign: 'center', marginBottom: 20 },
  scheduleButton: { backgroundColor: '#1A1A1A', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, elevation: 2 },
  scheduleButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  listContainer: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 12, backgroundColor: '#F4F0E8' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', flexShrink: 1, marginRight: 8 },
  statusBadge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 15, minWidth: 80, alignItems: 'center' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  statusPending:    { backgroundColor: '#f39c12' },
  statusAccepted:   { backgroundColor: '#2ecc71' },
  statusRejected:   { backgroundColor: '#e74c3c' },
  statusCompleted:  { backgroundColor: '#3498db' },
  statusCancelled:  { backgroundColor: '#95a5a6' }, // Gris para Cancelada por cliente
  statusDefault:    { backgroundColor: '#bdc3c7' },
  cardText: { fontSize: 15, color: '#4A4A4A', marginBottom: 6, lineHeight: 22 },
  cardTextBold: { fontSize: 15, color: '#333333', fontWeight: 'bold', marginBottom: 5 },
  servicesContainer: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#ECECEC', paddingTop: 10 },
  serviceItem: { fontSize: 14, color: '#555555', marginLeft: 10, lineHeight: 20, marginBottom: 3 },
  priceText: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginTop: 10, textAlign: 'right', borderTopWidth: 1, borderTopColor: '#ECECEC', paddingTop: 10 },
  notesContainer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ECECEC' },
  notesTextContent: { fontSize: 14, color: '#555555', fontStyle: 'italic', lineHeight: 20 },
  cancelButton: { marginTop: 15, backgroundColor: '#e74c3c', paddingVertical: 10, borderRadius: 8, alignItems: 'center', minHeight: 40, justifyContent: 'center' },
  cancelButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  errorTextTitle: { fontSize: 20, fontWeight: 'bold', color: 'red', textAlign: 'center', marginBottom: 10, },
  errorTextMessage: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 20, },
  retryButton: { backgroundColor: '#1A1A1A', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 8, },
  retryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', },
});

export default AppointmentsScreen;