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

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001/api';

export type RootStackParamList = {
  AppointmentsScreen: {userId: number | string; refresh?: boolean};
  AppointmentDetail: {cita: AppointmentFromBackend; userId?: string | number};
  PaymentDataEntry: {cita: AppointmentFromBackend};
};

export interface AppointmentFromBackend {
  id: number;
  usuario_id: number | string;
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
  libelula_transaction_id?: string;
  libelula_payment_url?: string;
  libelula_qr_url?: string;
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

  const {cita: initialCita, userId: clienteUserId} = route.params || {};

  const [citaActual, setCitaActual] = useState<AppointmentFromBackend | null>(
    initialCita || null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const refreshCitaData = async (citaId: number) => {
    setIsLoading(true);
    console.log(
      `Intentando refrescar datos para la cita ID: ${citaId} (simulado)`,
    );
    if (initialCita && initialCita.id === citaId) {
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
      }
    }, [citaActual?.id]),
  );

  const handleProceedToPayment = () => {
    if (!citaActual) return;
    navigation.navigate('PaymentDataEntry', {cita: citaActual});
  };

  const handleCancelAppointmentByClient = async () => {
    if (!citaActual || isLoading) return;

    // Verificar si el clienteUserId está disponible (debería venir de route.params)
    if (!clienteUserId) {
      Alert.alert(
        'Error',
        'No se pudo identificar al usuario para esta acción.',
      );
      return;
    }

    if (String(citaActual.usuario_id) !== String(clienteUserId)) {
      Alert.alert(
        'No permitido',
        'No puedes cancelar una cita que no te pertenece.',
      );
      return;
    }

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
              const response = await fetch(
                `${API_BASE_URL}/appointments/${citaActual.id}/cancel-by-client`,
                {
                  method: 'PUT',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({userId: clienteUserId}), // Enviar el ID del cliente para verificación en backend
                },
              );

              const responseData = await response.json();

              if (response.ok && responseData.appointment) {
                setCitaActual(responseData.appointment); // Actualiza la cita local con la respuesta del backend
                Alert.alert('Éxito', 'Cita cancelada correctamente.');
                // Notificar a la pantalla anterior para refrescar
                if (clienteUserId && navigation.canGoBack()) {
                  // Podrías navegar a AppointmentsScreen específicamente si es mejor UX
                  navigation.navigate('AppointmentsScreen', {
                    userId: clienteUserId,
                    refresh: true,
                  });
                } else if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              } else {
                Alert.alert(
                  'Error al cancelar',
                  responseData.error ||
                    'No se pudo cancelar la cita. Intenta de nuevo.',
                );
              }
            } catch (error: any) {
              Alert.alert(
                'Error de Red',
                error.message || 'No se pudo conectar con el servidor.',
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
  const canBeCancelledByClient =
    ['Pendiente', 'Aceptada'].includes(citaActual.estado_de_cita) &&
    citaActual.estado_pago !== 'Pagado';

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

      {canBeCancelledByClient && ( // Usar la variable para mostrar el botón
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
  proceedToPaymentButton: {backgroundColor: '#222'}, // Azul primario
  cancelByClientButton: {backgroundColor: '#FF3838', marginTop: 10}, // Gris para cancelar
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
