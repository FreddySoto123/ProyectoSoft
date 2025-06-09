// screens/BarberAppointmentDetailScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image
} from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './navigation/AuthNavigator'; // Ajusta la ruta a tu AuthNavigator

// Define la estructura de una cita (debe coincidir con lo que devuelve el backend)
interface AppointmentDetail {
  id: number;
  fecha: string;
  hora: string;
  nombre_cliente: string;
  avatar_cliente?: string;
  servicios_nombres: string[];
  estado_de_cita: boolean; // Coincide con tu columna BOOLEAN
  duracion_total_estimada?: number;
  precio_total?: number; // Este vendrá de monto_total
  // notas_cliente?: string; // Ya no existe o es opcional si decides añadirla después
}

type BarberAppointmentDetailRouteProp = RouteProp<RootStackParamList, 'BarberAppointmentDetail'>;
type BarberAppointmentDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BarberAppointmentDetail'>;

interface Props {
  route: BarberAppointmentDetailRouteProp;
  navigation: BarberAppointmentDetailNavigationProp;
}

// CONFIGURACIÓN DE LA IP DEL BACKEND (ajusta según sea necesario)
// Si usas emulador Android, considera 'http://10.0.2.2:3001'
// Si usas dispositivo físico, usa la IP de tu PC en la red local.
const API_BASE_URL = 'http://192.168.1.210:3001'; // <<--- AJUSTA ESTA IP SI ES NECESARIO

const BarberAppointmentDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { appointmentId, barberName } = route.params;
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- LOG AÑADIDO ---
  console.log('BarberAppointmentDetailScreen - Props recibidas:', route.params);
  console.log('BarberAppointmentDetailScreen - appointmentId para cargar:', appointmentId);

  const fetchAppointmentDetail = useCallback(async () => {
    if (!appointmentId) { // Verificación temprana
      console.error('BarberAppointmentDetail: appointmentId es undefined o null. No se puede cargar.');
      setError('ID de cita no válido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const fetchUrl = `${API_BASE_URL}/api/citas/${appointmentId}`; // Usar la constante API_BASE_URL
    // --- LOG AÑADIDO ---
    console.log(`BarberAppointmentDetail: Cargando detalle para cita ID: ${appointmentId}. URL: ${fetchUrl}`);

    try {
      const response = await fetch(fetchUrl);
      // --- LOG AÑADIDO ---
      console.log(`BarberAppointmentDetail: Respuesta recibida del fetch. Status: ${response.status}`);

      // Leer como texto primero para depurar en caso de JSON inválido
      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
         // --- LOG AÑADIDO ---
        console.log('BarberAppointmentDetail: Detalle de cita RAW del backend (parseado):', JSON.stringify(data, null, 2));
      } catch (jsonError: any) {
        console.error('BarberAppointmentDetail: Error parseando JSON de respuesta:', jsonError.message, responseText);
        setError(`Error del servidor (formato inesperado). Status: ${response.status}`);
        Alert.alert('Error de Formato', `Respuesta inesperada del servidor.`);
        setLoading(false);
        return;
      }


      if (response.ok) {
        setAppointment(data); // Asumiendo que 'data' es el objeto AppointmentDetail
        if (data.nombre_cliente) {
             navigation.setOptions({ title: `Cita de ${data.nombre_cliente}` });
        }
      } else {
        console.error('BarberAppointmentDetail: Error al cargar detalle de cita (backend):', data?.error || `Status ${response.status}`);
        setError(data?.error || 'No se pudo cargar el detalle de la cita.');
        Alert.alert('Error de Carga', data?.error || 'No se pudo cargar el detalle de la cita.');
      }
    } catch (e: any) {
      console.error('BarberAppointmentDetail: Error de red al cargar detalle de cita:', e.message, e);
      setError('Error de red. Intenta de nuevo más tarde.');
      Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
      console.log(`BarberAppointmentDetail: FIN fetchAppointmentDetail para cita ID: ${appointmentId}`);
    }
  }, [appointmentId, navigation]); // navigation se añade si usas setOptions

  useFocusEffect(
    useCallback(() => {
      fetchAppointmentDetail();
    }, [fetchAppointmentDetail])
  );

  const handleUpdateStatus = async (newStatusAction: 'aceptada' | 'rechazada') => {
    if (!appointment) return;
    setUpdatingStatus(true);

    const updateUrl = `${API_BASE_URL}/api/citas/${appointment.id}/estado`; // Usar la constante API_BASE_URL
    // --- LOG AÑADIDO ---
    console.log(`BarberAppointmentDetail: Actualizando estado a '${newStatusAction}' para cita ID: ${appointment.id}. URL: ${updateUrl}`);

    try {
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevoEstado: newStatusAction }), // El backend espera 'aceptada' o 'rechazada'
      });

      // --- LOG AÑADIDO ---
      console.log(`BarberAppointmentDetail: Respuesta de actualización de estado. Status: ${response.status}`);
      const data = await response.json(); // Intentar parsear siempre para ver mensaje de error
      // --- LOG AÑADIDO ---
      console.log('BarberAppointmentDetail: Datos de respuesta de actualización:', JSON.stringify(data, null, 2));


      if (response.ok) {
        Alert.alert('Éxito', data.message || `Cita ${newStatusAction === 'aceptada' ? 'aceptada' : 'procesada como rechazada'}.`);

        // Actualizar el estado localmente
        // Si tu columna es boolean:
        if (newStatusAction === 'aceptada' && data.cita && typeof data.cita.estado_de_cita === 'boolean') {
            setAppointment(prev => prev ? { ...prev, estado_de_cita: data.cita.estado_de_cita } : null);
        } else if (newStatusAction === 'rechazada') {
            // Para booleano, si rechazar no cambia el estado en BD, podrías navegar atrás
            // o actualizar UI para reflejar que se intentó rechazar.
            // Si tu estado es string y el backend lo actualiza a 'rechazada':
            // setAppointment(prev => prev ? { ...prev, estado_cita: newStatusAction } : null);
            console.log("BarberAppointmentDetail: Cita procesada como rechazada.");
            navigation.goBack(); // Ejemplo de acción tras rechazar
        }
        // Si tu columna es string:
        // setAppointment(prev => prev ? { ...prev, estado_cita: newStatusAction } : null);

      } else {
        Alert.alert('Error', data.error || `No se pudo actualizar el estado de la cita.`);
      }
    } catch (e: any) {
      console.error('BarberAppointmentDetail: Error de red al actualizar estado:', e.message, e);
      Alert.alert('Error de Red', 'No se pudo conectar para actualizar el estado.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1A1A1A" /></View>;
  }
  if (error || !appointment) { // Si hay error O no hay appointment (después de cargar)
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'No se encontró la cita o no se pudo cargar.'}</Text>
        <TouchableOpacity onPress={fetchAppointmentDetail} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Desestructurar después de asegurar que 'appointment' no es null
  const { nombre_cliente, fecha, hora, servicios_nombres, duracion_total_estimada, precio_total, notas_cliente, estado_de_cita, avatar_cliente } = appointment;

  // AJUSTA LA LÓGICA DE esPendiente SEGÚN TU CAMPO 'estado_de_cita'
  // Si es boolean:
  const esPendiente = estado_de_cita === false;
  // Si es string:
  // const esPendiente = estado_de_cita === 'pendiente';

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.headerSection}>
        {avatar_cliente ? (
            <Image source={{ uri: avatar_cliente }} style={styles.clientAvatar} />
        ) : (
            <View style={styles.avatarPlaceholder}><Text style={styles.avatarPlaceholderText}>👤</Text></View>
        )}
        <Text style={styles.clientNameHeader}>{nombre_cliente}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen de la Cita</Text>
        {servicios_nombres && servicios_nombres.length > 0 && <InfoRow label="Servicio(s):" value={servicios_nombres.join(', ')} /> }
        <InfoRow label="Fecha:" value={new Date(fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
        <InfoRow label="Hora:" value={hora.substring(0,5)} />
        {duracion_total_estimada != null && <InfoRow label="Duración:" value={`${duracion_total_estimada} min`} />}
        {precio_total != null && <InfoRow label="Precio:" value={`Bs ${Number(precio_total).toFixed(2)}`} />}
      </View>

      {notas_cliente && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notas adicionales del cliente</Text>
          <Text style={styles.notesText}>{notas_cliente}</Text>
        </View>
      )}

      {esPendiente && ( // Solo mostrar botones si es pendiente
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleUpdateStatus('aceptada')}
            disabled={updatingStatus}
          >
            {updatingStatus ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Aceptar</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleUpdateStatus('rechazada')}
            disabled={updatingStatus}
          >
            {updatingStatus ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Rechazar</Text>}
          </TouchableOpacity>
        </View>
      )}

      {!esPendiente && (
         <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado de la Cita</Text>
            {/* AJUSTA LA LÓGICA PARA MOSTRAR ESTADO SEGÚN TU CAMPO 'estado_de_cita' */}
            {/* Si es boolean: */}
            <Text style={[styles.statusText, estado_de_cita === true ? styles.status_aceptada : styles.status_rechazada_o_completada_etc]}>
                {estado_de_cita === true ? 'Aceptada' : 'Procesada'} {/* O un texto más específico si tienes más info */}
            </Text>
            {/* Si es string:
            <Text style={[styles.statusText, styles[`status_${estado_de_cita}` as keyof typeof styles]]}>
                {estado_de_cita.charAt(0).toUpperCase() + estado_de_cita.slice(1)}
            </Text>
            */}
         </View>
      )}
    </ScrollView>
  );
};

const InfoRow: React.FC<{label: string; value: string | undefined | null}> = ({label, value}) => {
  if (value === undefined || value === null || value === '') return null; // No renderizar si no hay valor
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#f4f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4f8', paddingHorizontal: 20 },
  errorText: { color: 'red', fontSize: 16, textAlign: 'center', marginBottom: 15 },
  retryButton: { backgroundColor: '#1A1A1A', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 },
  retryButtonText: { color: '#fff', fontSize: 16 },
  headerSection: { alignItems: 'center', marginBottom: 20 },
  clientAvatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 10, backgroundColor: '#e0e0e0' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarPlaceholderText: { fontSize: 50, color: '#aaa' },
  clientNameHeader: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#2c3e50', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#ecf0f1', paddingBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 15, color: '#7f8c8d', fontWeight: '500', flexShrink: 1, marginRight: 10 }, // flexShrink y marginRight para etiquetas largas
  infoValue: { fontSize: 15, color: '#34495e', flexGrow: 1, textAlign: 'right' }, // flexGrow para que el valor use el espacio restante
  notesText: { fontSize: 15, color: '#34495e', lineHeight: 22 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    minHeight: 48,
    justifyContent: 'center',
  },
  acceptButton: { backgroundColor: '#2ecc71' },
  rejectButton: { backgroundColor: '#e74c3c' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statusText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', paddingVertical: 10 },
  status_aceptada: { color: '#2ecc71' },
  // Añade más estilos de status si cambias a string y tienes más estados
  status_rechazada_o_completada_etc: { color: '#7f8c8d' }, // Un color genérico para otros estados si usas booleano
  // status_pendiente: { color: '#f39c12' },
  // status_rechazada: { color: '#e74c3c' },
  // status_completada: { color: '#3498db' },
});

export default BarberAppointmentDetailScreen;