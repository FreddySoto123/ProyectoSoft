// screens/AppointmentDetailScreen.tsx
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import {
  useRoute,
  RouteProp,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

// --- CONFIGURACIÓN DE API --- (Asegúrate que sea la misma que en AppointmentsScreen)
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001/api';

// Tipos para navegación y parámetros
export type RootStackParamList = {
  AppointmentsScreen: {userId: number | string; refresh?: boolean};
  AppointmentDetail: {cita: AppointmentFromBackend; userId?: string | number};
  PaymentDataEntry: {cita: AppointmentFromBackend}; // Nueva pantalla para datos de pago
  // ... otras rutas ...
};

// Interfaz de la cita (misma que antes)
export interface AppointmentFromBackend {
  id: number;
  fecha: string;
  hora: string;
  monto_total: string | number;
  estado_de_cita:
    | 'Pendiente'
    | 'Aceptada'
    | 'Rechazada'
    | 'Completada'
    | 'Cancelada_Cliente'
    | 'Cancelada_Barbero';
  estado_pago: 'Pendiente' | 'Pagado' | 'Fallido' | 'Reembolsado';
  metodo_pago?: string | null;
  nombre_barberia: string;
  nombre_barbero: string;
  servicios_nombres: string;
  notas_cliente?: string | null;
  libelula_transaction_id?: string; // Estos podrían ya no ser necesarios aquí si se manejan en la siguiente pantalla
  libelula_payment_url?: string;
  libelula_qr_url?: string;
  // qr_para_pago?: string; // Puede que ya no sea necesario si el QR se muestra en la siguiente pantalla
}

type AppointmentDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'AppointmentDetail'
>;
type AppointmentDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AppointmentDetail'
>;

const AppointmentDetailScreen: React.FC = () => {
  const route = useRoute<AppointmentDetailScreenRouteProp>();
  const navigation = useNavigation<AppointmentDetailScreenNavigationProp>();

  const {cita: initialCita, userId} = route.params || {};

  const [citaActual, setCitaActual] = useState<AppointmentFromBackend | null>(
    initialCita || null,
  );
  const [isLoading, setIsLoading] = useState(false); // Para la acción de cancelar

  // Simulación de recarga de cita, en un caso real llamarías a tu API
  const refreshCitaData = async (citaId: number) => {
    setIsLoading(true);
    console.log(
      `Intentando refrescar datos para la cita ID: ${citaId} (simulado)`,
    );
    // En una app real:
    // const freshCita = await fetchCitaByIdFromApi(citaId);
    // setCitaActual(freshCita);
    // Por ahora, para simular que la lista de citas se actualizó y nos pasó una nueva initialCita:
    if (initialCita && initialCita.id === citaId) {
      // Si la prop initialCita se actualiza, useEffect la tomará
      console.log('Usando initialCita actualizada para el refresco.');
      setCitaActual(initialCita);
    } else {
      console.warn(
        'No se pudo refrescar la cita, no hay nuevos datos en initialCita o el ID no coincide.',
      );
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (initialCita) {
      setCitaActual(initialCita);
      navigation.setOptions({title: `Cita #${initialCita.id}`});
    } else {
      Alert.alert('Error', 'No se recibieron los detalles de la cita.');
      if (navigation.canGoBack()) navigation.goBack();
    }
  }, [initialCita, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (citaActual?.id) {
        console.log(
          `AppointmentDetailScreen - Enfocada, verificando cita ${citaActual.id}`,
        );
        // Si tenemos un `userId`, podríamos forzar una recarga de la lista de AppointmentsScreen
        // y esperar que `initialCita` se actualice a través de la navegación.
        // O, si tenemos un endpoint para obtener una cita por ID:
        // refreshCitaData(citaActual.id);
      }
    }, [citaActual?.id]), // No incluir refreshCitaData aquí para evitar bucles si no es memoizada correctamente
  );

  const handleProceedToPayment = () => {
    if (!citaActual) return;
    navigation.navigate('PaymentDataEntry', {cita: citaActual});
  };

  const handleCancelAppointmentByClient = async () => {
    if (!citaActual || isLoading) return;
    if (!['Pendiente', 'Aceptada'].includes(citaActual.estado_de_cita)) {
      Alert.alert(
        'No permitido',
        'Solo puedes cancelar citas pendientes o aceptadas.',
      );
      return;
    }
    if (citaActual.estado_pago === 'Pagado') {
      Alert.alert(
        'No permitido',
        'No puedes cancelar una cita que ya ha sido pagada.',
      );
      return;
    }

    Alert.alert(
      'Confirmar Cancelación',
      '¿Estás seguro de que deseas cancelar esta cita?',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Sí, Cancelar',
          onPress: async () => {
            setIsLoading(true);
            try {
              // ASUME QUE TIENES UN ENDPOINT ASÍ Y AUTENTICACIÓN DE CLIENTE
              // const response = await fetch(`${API_BASE_URL}/appointments/${citaActual.id}/cancel-by-client`, {
              //   method: 'PUT',
              //   headers: { 'Content-Type': 'application/json', /* 'Authorization': 'Bearer TOKEN_CLIENTE' */ },
              // });
              // const data = await response.json();
              // if (response.ok && data.appointment) {
              //   setCitaActual(data.appointment); // Actualiza la cita local
              //   Alert.alert("Éxito", "Cita cancelada.");
              //   // Opcional: notificar a la pantalla anterior para refrescar
              //   if (userId) navigation.navigate('AppointmentsScreen', {userId, refresh: true});
              //   else if (navigation.canGoBack()) navigation.goBack();
              // } else {
              //   Alert.alert("Error", data.error || "No se pudo cancelar la cita.");
              // }
              Alert.alert(
                'Funcionalidad Pendiente',
                'La cancelación por cliente aún no está implementada en el backend.',
              );
            } catch (error: any) {
              Alert.alert(
                'Error de Red',
                error.message || 'No se pudo conectar.',
              );
            } finally {
              setIsLoading(false);
            }
          },
          style: 'destructive',
        },
      ],
    );
  };

  if (!citaActual) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#333" />
        <Text style={styles.loadingText}>Cargando detalles...</Text>
      </View>
    );
  }

  let displayDate = 'Fecha inválida';
  if (citaActual.fecha) {
    const dateParts = citaActual.fecha.split('-');
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        displayDate = new Date(year, month, day).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    }
  }

  return (
    <ScrollView
      style={styles.screenContainer}
      contentContainerStyle={styles.scrollContentContainer}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={styles.screenContainer.backgroundColor}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cita #{citaActual.id}</Text>
        <InfoRow label="Barbería:" value={citaActual.nombre_barberia} />
        <InfoRow label="Barbero:" value={citaActual.nombre_barbero} />
        <InfoRow label="Servicios:" value={citaActual.servicios_nombres} />
        <InfoRow label="Fecha:" value={displayDate} />
        <InfoRow
          label="Hora:"
          value={citaActual.hora?.substring(0, 5) || 'N/A'}
        />
        <InfoRow
          label="Monto Total:"
          value={`Bs ${Number(citaActual.monto_total).toFixed(2)}`}
        />
        {citaActual.notas_cliente && (
          <InfoRow
            label="Mis Notas:"
            value={citaActual.notas_cliente}
            isMultiline
          />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado</Text>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Cita:</Text>
          <Text
            style={[
              styles.statusBadge,
              getStatusStyle(citaActual.estado_de_cita),
            ]}>
            {(citaActual.estado_de_cita || 'Pendiente')
              .replace('_Cliente', '')
              .replace('_Barbero', '')}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Pago:</Text>
          <Text
            style={[
              styles.statusBadge,
              styles.paymentBadge,
              getPaymentStatusStyle(citaActual.estado_pago),
            ]}>
            {citaActual.estado_pago}
          </Text>
        </View>
        {citaActual.metodo_pago && (
          <InfoRow label="Método Pago:" value={citaActual.metodo_pago} />
        )}
      </View>

      {/* Sección de Acción Principal */}
      {citaActual.estado_de_cita === 'Aceptada' &&
        citaActual.estado_pago === 'Pendiente' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.proceedToPaymentButton]}
            onPress={handleProceedToPayment}>
            <Text style={styles.actionButtonText}>Proceder al Pago</Text>
          </TouchableOpacity>
        )}

      {citaActual.estado_pago === 'Pagado' && (
        <View style={styles.paidMessageContainer}>
          <Text style={styles.paidMessageText}>
            ¡Esta cita ya ha sido pagada!
          </Text>
          {citaActual.metodo_pago && (
            <Text style={styles.paidMethodText}>
              Método: {citaActual.metodo_pago}
            </Text>
          )}
        </View>
      )}

      {['Pendiente', 'Aceptada'].includes(citaActual.estado_de_cita) &&
        citaActual.estado_pago !== 'Pagado' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelByClientButton]}
            onPress={handleCancelAppointmentByClient}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Cancelar Mi Cita</Text>
            )}
          </TouchableOpacity>
        )}
      {isLoading && (
        <ActivityIndicator style={{marginTop: 10}} size="small" color="#333" />
      )}
    </ScrollView>
  );
};

// Componentes y estilos auxiliares (InfoRow, getStatusStyle, getPaymentStatusStyle, y StyleSheet)
// permanecen IGUALES que en la respuesta anterior donde se corrigió el problema de "Estado".
// Asegúrate de copiarlos desde esa respuesta. Para brevedad, no los repetiré aquí.

// Solo como recordatorio rápido de los estilos que podrías necesitar para el nuevo botón:
const styles = StyleSheet.create({
  // ... (todos los estilos anteriores)
  screenContainer: {flex: 1, backgroundColor: '#f4f6f8'},
  scrollContentContainer: {padding: 15, paddingBottom: 40},
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f4f6f8',
  },
  loadingText: {marginTop: 10, fontSize: 16, color: '#555'},
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#2c3e50',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingBottom: 12,
  },
  infoRow: {flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start'},
  label: {
    fontWeight: '600',
    color: '#495057',
    marginRight: 8,
    fontSize: 16,
    width: 110,
  },
  value: {fontSize: 16, color: '#212529', flex: 1},
  multilineValue: {fontStyle: 'italic', color: '#555', lineHeight: 22},
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
    textAlign: 'center',
    textTransform: 'capitalize',
    minWidth: 90,
  },
  statusAccepted: {backgroundColor: '#d1e7dd', color: '#0f5132'},
  statusPending: {backgroundColor: '#fff3cd', color: '#664d03'},
  statusRejected: {backgroundColor: '#f8d7da', color: '#842029'},
  statusCancelled: {backgroundColor: '#e2e3e5', color: '#41464b'},
  statusCompleted: {backgroundColor: '#cff4fc', color: '#055160'},
  paymentBadge: {},
  paymentPaid: {backgroundColor: '#d1e7dd', color: '#0f5132'},
  paymentPending: {backgroundColor: '#fff3cd', color: '#664d03'},
  paymentFailed: {backgroundColor: '#f8d7da', color: '#842029'},
  actionButton: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  proceedToPaymentButton: {backgroundColor: '#007bff'}, // Azul primario
  cancelByClientButton: {backgroundColor: '#6c757d', marginTop: 10}, // Gris para cancelar
  paidMessageContainer: {
    padding: 15,
    backgroundColor: '#d1e7dd', // Verde claro
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  paidMessageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f5132', // Verde oscuro
  },
  paidMethodText: {
    fontSize: 14,
    color: '#0f5132',
    marginTop: 5,
  },
});

const InfoRow: React.FC<{
  label: string;
  value?: string | null;
  isMultiline?: boolean;
}> = ({label, value, isMultiline}) =>
  value || (isMultiline && value !== undefined) ? (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, isMultiline && styles.multilineValue]}>
        {value === null && isMultiline ? '(Sin notas)' : value || 'N/A'}
      </Text>
    </View>
  ) : null;

const getStatusStyle = (status: AppointmentFromBackend['estado_de_cita']) => {
  switch (status) {
    case 'Aceptada':
      return styles.statusAccepted;
    case 'Pendiente':
      return styles.statusPending;
    case 'Rechazada':
      return styles.statusRejected;
    case 'Completada':
      return styles.statusCompleted;
    case 'Cancelada_Cliente':
    case 'Cancelada_Barbero':
      return styles.statusCancelled;
    default:
      return {};
  }
};
const getPaymentStatusStyle = (
  status: AppointmentFromBackend['estado_pago'],
) => {
  switch (status) {
    case 'Pagado':
      return styles.paymentPaid;
    case 'Pendiente':
      return styles.paymentPending;
    case 'Fallido':
      return styles.paymentFailed;
    default:
      return {};
  }
};

export default AppointmentDetailScreen;
