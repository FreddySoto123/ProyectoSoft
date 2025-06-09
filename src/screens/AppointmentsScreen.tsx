// screens/AppointmentsScreen.tsx
import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

// --- CONFIGURACIÓN DE API ---
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001/api';

export type RootStackParamList = {
  AppointmentsScreen: {userId: number | string; refresh?: boolean};
  AppointmentDetail: {cita: AppointmentFromBackend};
  SelectBarbershop: undefined;
};

type AppointmentsScreenRouteProp = RouteProp<
  RootStackParamList,
  'AppointmentsScreen'
>;
type AppointmentsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AppointmentsScreen'
>;

export interface AppointmentFromBackend {
  id: number;
  fecha: string;
  hora: string;
  nombre_barberia: string;
  nombre_barbero: string;
  servicios_nombres: string;
  estado_de_cita:
    | 'Pendiente'
    | 'Aceptada'
    | 'Rechazada'
    | 'Completada'
    | 'Cancelada_Cliente'
    | 'Cancelada_Barbero';
  estado_pago: 'Pendiente' | 'Pagado' | 'Fallido' | 'Reembolsado';
  monto_total: string | number;
  libelula_transaction_id?: string;
  libelula_qr_url?: string;
  qr_para_pago?: string;
  avatar_barbero?: string;
}

const parseAppointmentDate = (
  fechaStr: string,
  horaStr: string,
): Date | null => {
  if (!fechaStr || !horaStr) return null;

  const dateParts = fechaStr.split('-');
  const timeParts = horaStr.split(':');

  if (dateParts.length !== 3 || timeParts.length < 2) return null;

  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);
  const hour = parseInt(timeParts[0], 10);
  const minute = parseInt(timeParts[1], 10);
  const second = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;

  if (
    isNaN(year) ||
    isNaN(month) ||
    isNaN(day) ||
    isNaN(hour) ||
    isNaN(minute) ||
    isNaN(second)
  ) {
    return null;
  }

  return new Date(year, month, day, hour, minute, second);
};

const AppointmentsScreen: React.FC = () => {
  const navigation = useNavigation<AppointmentsScreenNavigationProp>();
  const route = useRoute<AppointmentsScreenRouteProp>();
  const userId = route.params?.userId;

  const [citas, setCitas] = useState<AppointmentFromBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCitas = useCallback(
    async (isRefresh = false) => {
      if (!userId) {
        // ... (manejo de userId faltante igual que antes)
        setError('Usuario no identificado.');
        setLoading(false);
        if (isRefresh) setRefreshing(false);
        setCitas([]);
        return;
      }
      console.log(
        `APPOINTMENTS SCREEN - Fetching para userId: ${userId} a ${API_BASE_URL}/appointments/user/${userId}`,
      );
      if (!isRefresh && !citas.length) setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/appointments/user/${userId}`,
        );
        if (!response.ok) {
          let errorData = {error: `Error HTTP ${response.status}`};
          try {
            const errorJson = await response.json();
            errorData.error =
              errorJson.error || errorJson.message || errorData.error;
          } catch (e) {
            /* no-op */
          }
          throw new Error(errorData.error);
        }

        const data: AppointmentFromBackend[] = await response.json();
        console.log('APPOINTMENTS SCREEN - Citas raw recibidas:', data.length);
        if (data.length > 0) {
          // console.log('APPOINTMENTS SCREEN - Primera cita raw:', JSON.stringify(data[0], null, 2));
        }

        const sortedData = data.sort((a, b) => {
          // Depuración de fechas para el sort
          // console.log(`Sorting A: fecha='${a.fecha}', hora='${a.hora}'`);
          // console.log(`Sorting B: fecha='${b.fecha}', hora='${b.hora}'`);

          const dateA = parseAppointmentDate(a.fecha, a.hora);
          const dateB = parseAppointmentDate(b.fecha, b.hora);

          // console.log(`Parsed A: ${dateA}, Parsed B: ${dateB}`);

          if (!dateA && !dateB) return 0;
          if (!dateA) return 1; // Poner fechas inválidas al final
          if (!dateB) return -1; // Poner fechas inválidas al final

          return dateB.getTime() - dateA.getTime(); // Más recientes primero
        });

        setCitas(sortedData);
      } catch (e: any) {
        console.error(
          'APPOINTMENTS SCREEN - Error en fetchCitas:',
          e.message,
          e,
        );
        const errorMessage = e.message || 'Error de red. Verifica tu conexión.';
        setError(errorMessage);
        Alert.alert('Error al cargar citas', errorMessage);
        setCitas([]);
      } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [userId, citas.length],
  );

  useFocusEffect(
    useCallback(() => {
      console.log('APPOINTMENTS SCREEN - Enfocada, userId:', userId);
      if (userId) fetchCitas();
      else {
        setError('No se pudo identificar al usuario.');
        setLoading(false);
        setCitas([]);
      }
    }, [fetchCitas, userId]),
  );

  useEffect(() => {
    if (route.params?.refresh && userId) {
      console.log('APPOINTMENTS SCREEN - Recibido refresh, recargando.');
      fetchCitas(true);
      navigation.setParams({refresh: undefined});
    }
  }, [route.params?.refresh, fetchCitas, navigation, userId]);

  const handleRefresh = () => {
    if (userId) {
      setRefreshing(true);
      fetchCitas(true);
    } else Alert.alert('Error', 'Usuario no identificado.');
  };

  const userIdDelClienteActual = route.params?.userId;

  const navigateToDetail = (cita: AppointmentFromBackend) => {
    if (!userIdDelClienteActual) {
      Alert.alert(
        'Error',
        'No se pudo identificar al usuario actual para ver los detalles.',
      );
      return;
    }
    navigation.navigate('AppointmentDetail', {
      cita: cita,
      userId: userIdDelClienteActual,
    });
  };

  const renderItem = ({item}: {item: AppointmentFromBackend}) => {

    let displayDate = 'Fecha inválida';
    if (item.fecha) {
      const dateParts = item.fecha.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const d = new Date(year, month, day);
          displayDate = d.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        } else {
          // console.warn(`Fecha inválida para item ${item.id}: ${item.fecha}`);
        }
      } else {
        // console.warn(`Formato de fecha incorrecto para item ${item.id}: ${item.fecha}`);
      }
    } else {
      // console.warn(`Fecha no proporcionada para item ${item.id}`);
    }

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigateToDetail(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.nombre_barberia}
          </Text>
          <Text
            style={[
              styles.statusBadge,
              item.estado_de_cita === 'Aceptada' && styles.statusAccepted,
              item.estado_de_cita === 'Pendiente' && styles.statusPending,
              item.estado_de_cita === 'Rechazada' && styles.statusRejected,
              item.estado_de_cita === 'Completada' && styles.statusCompleted,
              (item.estado_de_cita === 'Cancelada_Cliente' ||
                item.estado_de_cita === 'Cancelada_Barbero') &&
                styles.statusCancelled,
            ]}>
            {item.estado_de_cita
              ? item.estado_de_cita
                  .replace('_Cliente', '')
                  .replace('_Barbero', '')
              : 'Desconocido'}
          </Text>
        </View>
        <Text style={styles.cardText}>
          <Text style={styles.cardTextLabel}>Barbero:</Text>{' '}
          {item.nombre_barbero}
        </Text>
        <Text style={styles.cardText}>
          <Text style={styles.cardTextLabel}>Fecha:</Text> {displayDate}
        </Text>
        <Text style={styles.cardText}>
          <Text style={styles.cardTextLabel}>Hora:</Text>{' '}
          {item.hora?.substring(0, 5) || 'N/A'}
        </Text>
        <Text style={styles.cardText} numberOfLines={2}>
          <Text style={styles.cardTextLabel}>Servicios:</Text>{' '}
          {item.servicios_nombres}
        </Text>
        <Text style={styles.cardText}>
          <Text style={styles.cardTextLabel}>Total:</Text> Bs{' '}
          {Number(item.monto_total).toFixed(2)}
        </Text>

        <View style={styles.paymentStatusContainer}>
          <Text style={styles.cardTextLabel}>Estado del Pago:</Text>
          <Text
            style={[
              styles.statusBadge,
              styles.paymentBadge,
              item.estado_pago === 'Pagado' && styles.paymentPaid,
              item.estado_pago === 'Pendiente' && styles.paymentPending,
              item.estado_pago === 'Fallido' && styles.paymentFailed,
            ]}>
            {item.estado_pago || 'N/A'}
          </Text>
        </View>

        {item.estado_de_cita === 'Aceptada' &&
          item.estado_pago === 'Pendiente' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigateToDetail(item)}>
              <Text style={styles.actionButtonText}>Pagar / Ver Detalles</Text>
            </TouchableOpacity>
          )}
      </TouchableOpacity>
    );
  };

  // Renderizado condicional (sin cambios respecto a tu última versión, parece correcto)
  if (loading && citas.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={styles.loadingText}>Cargando tus citas...</Text>
      </View>
    );
  }

  if (error && citas.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('SelectBarbershop')}
          style={[styles.scheduleButton, {marginTop: 15}]}>
          <Text style={styles.scheduleButtonText}>Agendar Nueva Cita</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F0E8" />
      <FlatList
        data={citas}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.centered}>
              <Text style={styles.infoText}>
                {userId
                  ? 'No tienes citas programadas.'
                  : 'Usuario no identificado.'}
              </Text>
              {userId && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('SelectBarbershop')}
                  style={styles.scheduleButton}>
                  <Text style={styles.scheduleButtonText}>
                    Agendar una Cita
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1A1A1A']}
            tintColor={'#1A1A1A'}
          />
        }
      />
    </>
  );
};

// Estilos (sin cambios respecto a tu última versión)
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F4F0E8',
  },
  loadingText: {marginTop: 12, fontSize: 16, color: '#454545'},
  infoText: {fontSize: 17, color: '#555', textAlign: 'center', lineHeight: 24},
  errorText: {
    fontSize: 17,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#222',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  retryButtonText: {color: 'white', fontSize: 16, fontWeight: '500'},
  listContainer: {
    flexGrow: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F4F0E8',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 15,
    fontSize: 11,
    fontWeight: 'bold',
    overflow: 'hidden',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    minWidth: 80,
  },
  statusAccepted: {backgroundColor: '#c8e6c9', color: '#2e7d32'},
  statusPending: {backgroundColor: '#fff9c4', color: '#f57f17'},
  statusRejected: {backgroundColor: '#ffcdd2', color: '#c62828'},
  statusCancelled: {backgroundColor: '#e0e0e0', color: '#424242'},
  statusCompleted: {backgroundColor: '#bbdefb', color: '#0d47a1'},

  cardText: {fontSize: 15, color: '#34495e', marginBottom: 5, lineHeight: 22},
  cardTextLabel: {fontWeight: '600', color: '#2c3e50'},
  paymentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  paymentBadge: {marginLeft: 8},
  paymentPaid: {backgroundColor: '#a5d6a7', color: '#1b5e20'},
  paymentPending: {backgroundColor: '#fff59d', color: '#ef6c00'},
  paymentFailed: {backgroundColor: '#ef9a9a', color: '#b71c1c'},
  actionButton: {
    marginTop: 15,
    backgroundColor: '#222',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  scheduleButton: {
    marginTop: 25,
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  scheduleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AppointmentsScreen;
