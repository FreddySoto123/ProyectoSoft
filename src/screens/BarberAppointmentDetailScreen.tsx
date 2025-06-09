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
import type { RootStackParamList } from './navigation/AuthNavigator'; // Ajusta la ruta

const API_BASE_URL = 'http://192.168.1.210:3001'; // Ajusta si es necesario

// Tipos de estado que el barbero puede establecer o que la cita puede tener
type BarberSettableAppointmentStatus = 'Aceptada' | 'Rechazada_barbero' | 'Completada'; // Añadido 'Completada'
type FullAppointmentStatus = 'Pendiente' | BarberSettableAppointmentStatus | 'Cancelada_cliente' | string;

interface AppointmentDetail {
  id: number;
  fecha: string;
  hora: string;
  nombre_cliente: string;
  avatar_cliente?: string;
  servicios_nombres: string[];
  estado_de_cita: FullAppointmentStatus;
  duracion_total_estimada?: string | number;
  precio_total?: number;
  notas_cliente?: string;
}

type BarberAppointmentDetailRouteProp = RouteProp<RootStackParamList, 'BarberAppointmentDetail'>;
type BarberAppointmentDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BarberAppointmentDetail'>;

interface Props {
  route: BarberAppointmentDetailRouteProp;
  navigation: BarberAppointmentDetailNavigationProp;
}

const InfoRow: React.FC<{label: string; value: string | number | undefined | null}> = ({label, value}) => {
  console.log(`InfoRow - Renderizando. Label: "${label}", Value:`, value, ", Tipo de Value:", typeof value);
  const stringValue = value !== undefined && value !== null ? String(value).trim() : '';
  if (stringValue === '') {
    return null;
  }
  try {
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{String(value)}</Text>
      </View>
    );
  } catch (infoRowError: any) { /* ... */ return null; }
};

const getStatusStyleForText = (status: string | undefined | null) => {
  if (!status) return styles.statusDefault;
  const s = status.toLowerCase();
  switch (s) {
    case 'pendiente': case 'false': return styles.statusPending;
    case 'aceptada': case 'true': return styles.statusAccepted;
    case 'rechazada_barbero': return styles.statusRejected;
    case 'completada': return styles.statusCompleted; // <<--- AÑADIDO
    case 'cancelada_cliente': return styles.statusCancelled; // <<--- AÑADIDO (si lo usas)
    default: return styles.statusDefault;
  }
};

const formatStatusForDetail = (status: string): string => {
    if(!status) return 'Estado Desconocido';
    const s = status.toLowerCase();
    switch(s) {
        case 'pendiente': return 'Pendiente de Confirmación';
        case 'aceptada': return 'Cita Aceptada';
        case 'rechazada_barbero': return 'Cita Rechazada';
        case 'completada': return 'Cita Completada'; // <<--- AÑADIDO
        case 'cancelada_cliente': return 'Cancelada por Cliente'; // <<--- AÑADIDO
        case 'true': return 'Cita Aceptada';
        case 'false': return 'Pendiente de Confirmación';
        default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
};


const BarberAppointmentDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { appointmentId } = route.params; // barberName ya no se usa aquí explícitamente
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionBeingProcessed, setActionBeingProcessed] = useState<BarberSettableAppointmentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  console.log('BarberAppointmentDetailScreen - appointmentId para cargar:', appointmentId);

  const fetchAppointmentDetail = useCallback(async () => {
    // ... (código de fetchAppointmentDetail como lo tenías, asegurando que obtiene estado_de_cita y notas_cliente)
    if (!appointmentId) { /* ... */ return; }
    setLoading(true); setError(null);
    const fetchUrl = `${API_BASE_URL}/api/citas/${appointmentId}`;
    console.log(`BarberAppointmentDetail: Cargando detalle. URL: ${fetchUrl}`);
    try {
      const response = await fetch(fetchUrl);
      const responseText = await response.text();
      let data;
      try { data = JSON.parse(responseText); } catch (e) { /* ... */ return; }
      console.log('BarberAppointmentDetail: Detalle RAW (parseado):', JSON.stringify(data, null, 2));
      if (response.ok && data) {
        setAppointment(data);
        if (data.nombre_cliente) { navigation.setOptions({ title: `Cita de ${data.nombre_cliente}` });}
      } else { /* ... */ }
    } catch (e) { /* ... */ }
    finally { setLoading(false); }
  }, [appointmentId, navigation]);

  useFocusEffect(useCallback(() => { fetchAppointmentDetail(); }, [fetchAppointmentDetail]));

  const handleUpdateStatus = async (newStatusAction: BarberSettableAppointmentStatus) => {
    if (!appointment) return;
    setUpdatingStatus(true);
    setActionBeingProcessed(newStatusAction);
    const updateUrl = `${API_BASE_URL}/api/citas/${appointment.id}/estado`;
    console.log(`BarberAppointmentDetail: Actualizando estado a '${newStatusAction}' para cita ID: ${appointment.id}`);

    try {
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevoEstado: newStatusAction }),
      });
      const data = await response.json();
      console.log('BarberAppointmentDetail: Respuesta de actualización:', data);

      if (response.ok && data.cita) {
        Alert.alert('Éxito', data.message || `Estado de cita actualizado.`);
        setAppointment(data.cita); // Actualizar con la cita completa devuelta
      } else {
        Alert.alert('Error', data.error || `No se pudo actualizar el estado.`);
      }
    } catch (e: any) {
      Alert.alert('Error de Red', 'No se pudo conectar para actualizar el estado.');
      console.error("Error actualizando estado: ", e);
    } finally {
      setUpdatingStatus(false);
      setActionBeingProcessed(null);
    }
  };

  if (loading) { /* ... ActivityIndicator ... */ }
  if (error || !appointment) { /* ... Mensaje de Error con botón Reintentar ... */ }
  // Código de los if anteriores
  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1A1A1A" /></View>;
  }
  if (error || !appointment) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTextTitle}>Error al Cargar</Text>
        <Text style={styles.errorTextMessage}>{error || 'No se encontró la cita o no se pudo cargar.'}</Text>
        <TouchableOpacity onPress={fetchAppointmentDetail} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { nombre_cliente, fecha, hora, servicios_nombres, duracion_total_estimada, precio_total, notas_cliente, estado_de_cita, avatar_cliente } = appointment;

  const lowerCaseStatus = estado_de_cita ? estado_de_cita.toLowerCase() : '';
  const esPendiente = lowerCaseStatus === 'pendiente';
  const esAceptada = lowerCaseStatus === 'aceptada'; // Para el botón "Completar"
  const esCanceladaPorCliente = lowerCaseStatus === 'cancelada_cliente';

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.headerSection}>
        {avatar_cliente ? ( <Image source={{ uri: avatar_cliente }} style={styles.clientAvatar} />)
            : (<View style={styles.avatarPlaceholder}><Text style={styles.avatarPlaceholderText}>👤</Text></View>)}
        <Text style={styles.clientNameHeader}>{nombre_cliente || 'Cliente Desconocido'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen de la Cita</Text>
        <InfoRow label="Servicio(s):" value={servicios_nombres && Array.isArray(servicios_nombres) && servicios_nombres.length > 0 ? servicios_nombres.join(', ') : undefined} />
        <InfoRow label="Fecha:" value={fecha ? new Date(fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : undefined} />
        <InfoRow label="Hora:" value={hora ? hora.substring(0,5) : undefined} />
        <InfoRow label="Duración:" value={duracion_total_estimada != null ? `${String(duracion_total_estimada)} min` : undefined} />
        <InfoRow label="Precio:" value={precio_total != null ? `Bs ${Number(precio_total).toFixed(2)}` : undefined} />
      </View>

      {notas_cliente && notas_cliente.toLowerCase() !== 'sin notas.' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notas del cliente</Text>
          <Text style={styles.notesText}>{notas_cliente}</Text>
        </View>
      )}

      {/* Acciones si la cita está Pendiente */}
      {esPendiente && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleUpdateStatus('Aceptada')}
            disabled={updatingStatus} >
            {updatingStatus && actionBeingProcessed === 'Aceptada' ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Aceptar</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleUpdateStatus('Rechazada_barbero')}
            disabled={updatingStatus} >
            {updatingStatus && actionBeingProcessed === 'Rechazada_barbero' ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Rechazar</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Acción si la cita está Aceptada */}
      {esAceptada && !esCanceladaPorCliente && ( // Solo si está aceptada y no cancelada por el cliente
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]} // Necesitarás un estilo para completeButton
            onPress={() => handleUpdateStatus('Completada')}
            disabled={updatingStatus} >
            {updatingStatus && actionBeingProcessed === 'Completada' ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Marcar como Completada</Text>}
          </TouchableOpacity>
          {/* Podrías tener un botón de "Cancelar por Barbero" aquí también si quieres */}
        </View>
      )}


      {/* Mostrar Estado Actual si no es pendiente o si ya fue procesada */}
      {(!esPendiente || estado_de_cita) && (
         <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado Actual</Text>
            <Text style={[styles.statusTextDisplay, getStatusStyleForText(estado_de_cita)]}>
                {formatStatusForDetail(estado_de_cita)}
            </Text>
         </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // ... (tus estilos existentes) ...
  completeButton: { backgroundColor: '#3498db' }, // Azul para Completada (ejemplo)
  statusTextDisplay: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', paddingVertical: 10 },
  statusPending:    { color: '#f39c12' },
  statusAccepted:   { color: '#2ecc71' },
  statusRejected:   { color: '#e74c3c' },
  statusCompleted:  { color: '#3498db' },
  statusCancelled:  { color: '#7f8c8d' }, // Para 'cancelada_cliente'
  statusDefault:    { color: '#7f8c8d' },
  // Copia todos tus estilos existentes aquí
  scrollContainer: { flexGrow: 1, backgroundColor: '#f4f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4f8', paddingHorizontal: 20 },
  errorTextTitle: { fontSize: 20, fontWeight: 'bold', color: 'red', textAlign: 'center', marginBottom: 10, },
  errorTextMessage: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 20, },
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
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' },
  infoLabel: { fontSize: 15, color: '#7f8c8d', fontWeight: '500', flex: 1, marginRight: 10 },
  infoValue: { fontSize: 15, color: '#34495e', flex: 2, textAlign: 'right' },
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
});

export default BarberAppointmentDetailScreen;