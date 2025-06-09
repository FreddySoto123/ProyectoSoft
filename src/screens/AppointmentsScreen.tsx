// AppointmentsScreen.tsx
import React, { useEffect, useState } from 'react';
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

type AppointmentsScreenRouteProp = RouteProp<RootStackParamList, 'AppointmentsScreen'>;
type AppointmentsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AppointmentsScreen'>;

interface Appointment {
  id: number;
  fecha: string;
  hora: string;
  nombre_barberia: string;
  nombre_barbero: string;
  servicios: string[]; // Se espera un array de strings
  estado_de_cita: boolean;
  precio_total?: number;
}

interface Props {
  route: AppointmentsScreenRouteProp;
  navigation: AppointmentsScreenNavigationProp;
}

const formatAppointmentStatus = (isAccepted: boolean): string => {
  return isAccepted ? 'Aceptada' : 'Pendiente';
};

const getStatusStyle = (isAccepted: boolean) => {
  return isAccepted ? styles.statusAccepted : styles.statusPending;
};

const AppointmentsScreen: React.FC<Props> = ({ route, navigation }) => {
  const userId = route.params?.userId;
  const [citas, setCitas] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null); // Para mostrar error si fetch falla

  const fetchCitas = React.useCallback(async () => {
    if (!userId) {
      Alert.alert('Error', 'ID de usuario no válido o no proporcionado.');
      console.warn('AppointmentsScreen: useEffect - userId is invalid:', userId);
      setLoading(false);
      setRefreshing(false);
      setCitas([]);
      setFetchError('ID de usuario no válido.'); // Guardar error
      return;
    }

    console.log('AppointmentsScreen: Fetching citas para userId:', userId);
    if (!refreshing) setLoading(true);
    setFetchError(null); // Limpiar error anterior

    try {
      const response = await fetch(`http://192.168.1.210:3001/api/citas/user/${userId}`);
      const responseText = await response.text(); // Leer como texto primero
      let data;

      try {
        data = JSON.parse(responseText);
        // --- LOG CRUCIAL ---
        console.log('AppointmentsScreen: Citas recibidas (RAW data del backend):', JSON.stringify(data, null, 2));
      } catch (jsonError: any) {
        console.error('AppointmentsScreen: Error parseando JSON:', jsonError.message, responseText);
        Alert.alert('Error de Formato', `Respuesta inesperada del servidor. Status: ${response.status}`);
        setCitas([]);
        setFetchError('Error de formato en la respuesta del servidor.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (response.ok) {
        // --- VERIFICACIÓN ANTES DE SETCITAS ---
        if (Array.isArray(data)) {
          // Opcional: Validar la estructura de cada item si es necesario
          // data.forEach(item => {
          //   if (typeof item.id !== 'number' || typeof item.nombre_barberia !== 'string' /* etc. */) {
          //     console.warn("AppointmentsScreen: Item con estructura inesperada:", item);
          //   }
          // });
          setCitas(data);
        } else {
          console.error('AppointmentsScreen: Error - La data recibida del backend no es un array:', data);
          Alert.alert('Error de Datos', 'El formato de datos recibido del servidor es incorrecto.');
          setCitas([]);
          setFetchError('Formato de datos incorrecto del servidor.');
        }
      } else {
        const errorMessage = data?.error || `Error ${response.status} al cargar citas.`;
        console.error('AppointmentsScreen: Error fetching citas (backend):', errorMessage, data);
        Alert.alert('Error', errorMessage);
        setCitas([]);
        setFetchError(errorMessage);
      }
    } catch (error: any) {
      console.error('AppointmentsScreen: Network error fetching citas:', error.message, error);
      Alert.alert('Error de Red', 'No se pudo conectar al servidor para obtener tus citas.');
      setCitas([]);
      setFetchError('Error de red al conectar con el servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, refreshing]);

  useFocusEffect(
    React.useCallback(() => {
      fetchCitas();
    }, [fetchCitas])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCitas();
  };

  if (loading && !refreshing && citas.length === 0 && !fetchError) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={styles.loadingText}>Cargando tus citas...</Text>
      </View>
    );
  }

  // Mostrar error de fetch si ocurrió
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
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>No se pudo identificar al usuario para cargar las citas.</Text>
      </View>
    );
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

  // --- RENDER ITEM SIMPLIFICADO PARA DEPURACIÓN ---
  const renderItem = ({ item }: { item: Appointment }) => {
    console.log("APPOINTMENTS_SCREEN - Renderizando item ID:", item.id, "Nombre Barbería:", item.nombre_barberia, "Estado:", item.estado_de_cita);
    try {
      return (
        <View style={styles.card}>
          {/* <Text style={styles.cardTitle}>ID Cita: {item.id}</Text> // Puedes dejarlo o quitarlo */}

          {/* PASO 1 y 2: Header con Nombre de barbería y Estado */}
          {/* DESCOMENTA ESTE BLOQUE PRIMERO */}
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{item.nombre_barberia !== null && item.nombre_barberia !== undefined ? item.nombre_barberia : 'N/A'}</Text>
            <View style={[styles.statusBadge, getStatusStyle(item.estado_de_cita)]}>
              <Text style={styles.statusText}>{formatAppointmentStatus(item.estado_de_cita)}</Text>
            </View>
          </View>

          {/* PASO 3: Nombre del barbero */}
          {/* LUEGO DESCOMENTA ESTA LÍNEA */}
          <Text style={styles.cardText}>Barbero: {item.nombre_barbero !== null && item.nombre_barbero !== undefined ? item.nombre_barbero : 'N/A'}</Text> 

          {/* PASO 4: Fecha */}
          {/* LUEGO DESCOMENTA ESTE BLOQUE */}
          
          <Text style={styles.cardText}>
            Fecha: {item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
          </Text>
          

          {/* PASO 5: Hora */}
          {/* LUEGO DESCOMENTA ESTA LÍNEA */}
           <Text style={styles.cardText}>Hora: {item.hora ? item.hora.substring(0,5) : 'N/A'}</Text> 

          {/* PASO 6: Servicios */}
          {/* LUEGO DESCOMENTA ESTE BLOQUE */}
          
          {item.servicios && Array.isArray(item.servicios) && item.servicios.length > 0 && (
            <View style={styles.servicesContainer}>
              <Text style={styles.cardTextBold}>Servicios:</Text>
              {item.servicios.map((servicio, index) => (
                <Text key={index} style={styles.serviceItem}>- {typeof servicio === 'string' ? servicio : 'Servicio inválido'}</Text>
              ))}
            </View>
          )}
          

          {/* PASO 7: Precio total */}
          {/* FINALMENTE DESCOMENTA ESTE BLOQUE */}
          
          {item.precio_total != null && ( // != null cubre undefined y null
            <Text style={styles.priceText}>Precio Total: Bs {Number(item.precio_total).toFixed(2)}</Text>
          )}
          
        </View>
      );
    } catch (renderError: any) {
      console.error("APPOINTMENTS_SCREEN - ERROR DENTRO DE RENDER ITEM para cita ID:", item.id, renderError.message, renderError.stack);
      return (
        <View style={{ padding: 10, marginVertical: 5, borderColor: 'red', borderWidth: 1 }}>
          <Text>Error renderizando item {item.id}</Text>
        </View>
      );
    }
  };


  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F0E8" />
      <FlatList
        data={citas}
        keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()} // Fallback para key
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
  // ... (tus estilos existentes) ...
  // Añadir estilos para el mensaje de error si fetch falla
  errorTextTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorTextMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F4F0E8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  infoText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  scheduleButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    elevation: 2,
  },
  scheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F4F0E8',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flexShrink: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusPending: {
    backgroundColor: '#f39c12',
  },
  statusAccepted: {
    backgroundColor: '#2ecc71',
  },
  cardText: {
    fontSize: 15,
    color: '#444',
    marginBottom: 5,
    lineHeight: 22,
  },
  cardTextBold: {
    fontSize: 15,
    color: '#444',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  servicesContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 8,
  },
  serviceItem: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
    lineHeight: 20,
  },
  priceText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 8,
    textAlign: 'right',
  }
});

export default AppointmentsScreen;