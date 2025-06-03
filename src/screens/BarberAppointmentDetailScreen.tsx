// screens/BarberAppointmentDetailScreen.tsx (Ejemplo)
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useRoute, RouteProp, useNavigation} from '@react-navigation/native';

// Estructura de la cita que recibe el barbero
interface CitaParaBarbero {
  id: number;
  fecha: string;
  hora: string;
  monto_total: string | number;
  estado_pago: string;
  metodo_pago?: string;
  nombre_barberia: string;
  nombre_cliente: string;
  servicios_nombres: string;
  // añade notas_cliente si el backend las devuelve
}

type RootStackParamList = {
  BarberAppointmentDetail: {cita: CitaParaBarbero; onGoBack?: () => void}; // Pasas el objeto cita, onGoBack para refrescar lista
};
type BarberAppointmentDetailRouteProp = RouteProp<
  RootStackParamList,
  'BarberAppointmentDetail'
>;

// Simulación de la función del controlador de citas del frontend
const API_URL = 'http://localhost:3001/api';
export const actualizarEstadoPagoCita = async (
  citaId: number,
  nuevoEstado: string,
  metodoPago: string = 'QR Manual',
) => {
  try {
    const response = await fetch(
      `${API_URL}/appointments/${citaId}/payment-status`,
      {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          estado_pago: nuevoEstado,
          metodo_pago: nuevoEstado === 'Pagado' ? metodoPago : null,
        }),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error al actualizar estado de pago');
    }
    return data;
  } catch (error) {
    console.error(
      `Error al actualizar estado de pago para cita ${citaId}:`,
      error,
    );
    throw error;
  }
};

const BarberAppointmentDetailScreen: React.FC = () => {
  const route = useRoute<BarberAppointmentDetailRouteProp>();
  const navigation = useNavigation();

  // Usar el estado local para poder actualizarlo después de la acción
  const [citaActual, setCitaActual] = useState<CitaParaBarbero>(
    route.params.cita,
  );
  const {onGoBack} = route.params; // Función para refrescar la lista anterior

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdatePayment = async (nuevoEstado: 'Pagado' | 'Pendiente') => {
    if (!citaActual || isLoading) return;
    setIsLoading(true);
    setMessage('');
    try {
      const data = await actualizarEstadoPagoCita(
        citaActual.id,
        nuevoEstado,
        nuevoEstado === 'Pagado'
          ? citaActual.metodo_pago || 'QR Confirmado'
          : undefined,
      );
      setMessage(data.message || 'Estado actualizado.');
      // Actualizar el estado local de la cita
      if (data.appointment) {
        setCitaActual(prev => ({...prev, ...data.appointment}));
      }
      // Llamar a onGoBack para que la pantalla anterior sepa que debe recargar
      if (onGoBack) {
        onGoBack();
      }
      Alert.alert('Éxito', data.message || 'Estado de pago actualizado.');
    } catch (error: any) {
      setMessage(error.message || 'Error al actualizar estado.');
      Alert.alert(
        'Error',
        error.message || 'No se pudo actualizar el estado del pago.',
      );
    }
    setIsLoading(false);
  };

  if (!citaActual) {
    return (
      <ActivityIndicator
        size="large"
        style={{flex: 1, justifyContent: 'center'}}
      />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Cita #{citaActual.id} - Barbero</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detalles del Cliente y Cita</Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Cliente:</Text> {citaActual.nombre_cliente}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Barbería:</Text>{' '}
          {citaActual.nombre_barberia}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Servicios:</Text>{' '}
          {citaActual.servicios_nombres}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Fecha:</Text>{' '}
          {new Date(citaActual.fecha).toLocaleDateString()}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Hora:</Text>{' '}
          {citaActual.hora.substring(0, 5)}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Monto Total:</Text> Bs{' '}
          {Number(citaActual.monto_total).toFixed(2)}
        </Text>

        <View style={styles.paymentStatusSection}>
          <Text style={styles.label}>Estado Actual del Pago:</Text>
          <Text
            style={[
              styles.statusText,
              citaActual.estado_pago === 'Pagado'
                ? styles.statusPaid
                : styles.statusPending,
            ]}>
            {citaActual.estado_pago}
          </Text>
          {citaActual.metodo_pago && (
            <Text style={styles.detailText}>
              <Text style={styles.label}>Método:</Text> {citaActual.metodo_pago}
            </Text>
          )}
        </View>
      </View>

      {message && <Text style={styles.messageText}>{message}</Text>}

      <View style={styles.actionsContainer}>
        {citaActual.estado_pago === 'Pendiente' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => handleUpdatePayment('Pagado')}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>
                Confirmar Pago Recibido
              </Text>
            )}
          </TouchableOpacity>
        )}
        {citaActual.estado_pago === 'Pagado' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.pendingButton]}
            onPress={() => handleUpdatePayment('Pendiente')}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Marcar como Pendiente</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f8f9fa', padding: 15},
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#343a40',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#495057',
  },
  detailText: {fontSize: 16, marginBottom: 8, color: '#495057', lineHeight: 22},
  label: {fontWeight: 'bold', color: '#212529'},
  paymentStatusSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  statusText: {fontSize: 17, fontWeight: 'bold', marginTop: 5},
  statusPaid: {color: '#28a745'}, // Verde
  statusPending: {color: '#dc3545'}, // Rojo
  actionsContainer: {marginTop: 10, paddingHorizontal: 5},
  actionButton: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 1,
  },
  confirmButton: {backgroundColor: '#28a745'},
  pendingButton: {backgroundColor: '#ffc107'},
  actionButtonText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  messageText: {
    textAlign: 'center',
    color: '#007bff',
    marginVertical: 10,
    fontSize: 15,
  },
});

export default BarberAppointmentDetailScreen;
