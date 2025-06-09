import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {StackNavigationProp} from '@react-navigation/stack'; // Para tipar navigation

// --- Interfaces ---
interface User {
  id: number; // Este es el usuario_id del cliente
  // Podría tener más campos como name, email, token, etc., pero para esta pantalla solo se usa 'id'.
}

interface Barber {
  barbero_id: number; // ID de la tabla 'barberos' (PK)
  usuario_id: number; // ID del usuario asociado (FK a 'users.id'), ESTE ES EL QUE SE ENVÍA AL BACKEND
  nombre_barbero: string;
  especialidad?: string;
  avatar_barbero?: string;
  // Otros campos que pueda devolver la API...
}

interface Service {
  id: number;
  nombre: string;
  descripcion?: string;
  duracion_estimada_minutos?: number;
  precio: number; // Asegurarse de que esto sea un número
}

interface BarbershopDetails {
  id: number; // Este es el barberia_id
  nombre: string;
  logo_url?: string;
  servicios: Service[];
  barberos: Barber[];
  // Otros campos que pueda devolver la API...
}

// Tipos para la navegación y parámetros de ruta
type RootStackParamList = {
  CitaScreen: {
    user: User;
    barberiaId: number;
    barberoId?: number; // Este debería ser el usuario_id del barbero si viene preseleccionado
  };
  AppointmentsScreen: {userId: number};
  // ... otras rutas
};

type CitaScreenRouteProp = RouteProp<RootStackParamList, 'CitaScreen'>;
type CitaScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CitaScreen'
>;

// --- Constantes ---
// Asegúrate de que esta sea la URL base correcta de tu backend
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api'; // Ajusta según tu configuración

const CitaScreen = () => {
  const navigation = useNavigation<CitaScreenNavigationProp>();
  const route = useRoute<CitaScreenRouteProp>();

  // Parámetros de la ruta
  const {
    user,
    barberiaId,
    barberoId: preselectedBarberUsuarioId,
  } = route.params;

  // --- Estados ---
  const [barbershop, setBarbershop] = useState<BarbershopDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]); // Cambiado para soportar múltiples servicios en el futuro, por ahora solo 1

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [notasCliente, setNotasCliente] = useState('');

  // --- Efectos ---
  useEffect(() => {
    const fetchBarbershopData = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/barbershops/${barberiaId}`,
        );
        if (!response.ok) {
          throw new Error(
            `Error HTTP ${response.status}: No se pudo cargar la información.`,
          );
        }
        const data: BarbershopDetails = await response.json();
        setBarbershop(data);

        if (preselectedBarberUsuarioId && data.barberos) {
          const foundBarber = data.barberos.find(
            b => b.usuario_id === preselectedBarberUsuarioId,
          );
          if (foundBarber) {
            setSelectedBarber(foundBarber);
          }
        }
      } catch (error: any) {
        console.error('Error fetching barbershop data:', error);
        Alert.alert(
          'Error',
          error.message || 'No se pudo cargar la información de la barbería.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBarbershopData();
  }, [barberiaId, preselectedBarberUsuarioId]);

  // --- Manejadores de Eventos ---
  const handleSelectBarber = (barber: Barber) => {
    setSelectedBarber(barber);
    //setSelectedServices([]); // Resetear servicios si cambia el barbero (opcional, depende de la lógica de negocio)
  };

  const handleSelectService = (service: Service) => {
    // Para selección única (como en el código original):
    setSelectedServices([service]);

    // Si quisieras selección múltiple:
    // setSelectedServices(prev => {
    //   const exists = prev.find(s => s.id === service.id);
    //   if (exists) {
    //     return prev.filter(s => s.id !== service.id); // Deseleccionar
    //   }
    //   return [...prev, service]; // Seleccionar
    // });
  };

  const handleDateTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowPicker(Platform.OS === 'ios'); // En iOS, el picker puede permanecer visible
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const showMode = (currentMode: 'date' | 'time') => {
    setShowPicker(true);
    setPickerMode(currentMode);
  };

  const handleConfirmAppointment = async () => {
    if (!selectedBarber || selectedServices.length === 0 || !barbershop) {
      Alert.alert(
        'Atención',
        'Por favor, selecciona un barbero, al menos un servicio, fecha y hora.',
      );
      return;
    }

    setIsSubmitting(true);

    const montoTotal = selectedServices.reduce(
      (sum, service) => sum + Number(service.precio),
      0,
    );
    const serviciosIds = selectedServices.map(service => service.id);

    const appointmentPayload = {
      usuario_id: user.id,
      barberia_id: barbershop.id,
      barbero_id: selectedBarber.barbero_id,
      fecha: date.toISOString().split('T')[0], // YYYY-MM-DD
      hora: date.toTimeString().split(' ')[0].substring(0, 8), // HH:MM:SS
      servicios: serviciosIds, // Array de IDs de servicios
      monto_total: montoTotal,
      notas_cliente: notasCliente.trim() || null,
    };

    console.log(
      'Enviando payload de cita:',
      JSON.stringify(appointmentPayload, null, 2),
    );

    try {
      // Usar la ruta que realmente apunta a `appointmentController.createAppointment`
      // Si es /api/citas y usa el controller correcto, está bien.
      // Si es /api/appointments, cambia la URL aquí.
      const response = await fetch(`${API_BASE_URL}/appointments`, {
        // Ajustado a /appointments según controller
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Considera añadir token de autenticación si es necesario:
          // 'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify(appointmentPayload),
      });

      const responseData = await response.json();

      if (response.ok) {
        Alert.alert(
          'Cita Registrada',
          responseData.message ||
            'Tu cita ha sido agendada exitosamente y está pendiente de aprobación.',
          [
            {
              text: 'Ver Mis Citas',
              onPress: () =>
                navigation.navigate('AppointmentsScreen', {userId: user.id}),
            },
            {text: 'Cerrar', style: 'cancel'},
          ],
        );
        // Opcional: Resetear el formulario o navegar a otra pantalla
        // setSelectedBarber(null);
        // setSelectedServices([]);
        // setNotasCliente('');
        // setDate(new Date());
      } else {
        console.error(
          'Error al crear cita - Respuesta del servidor:',
          responseData,
        );
        Alert.alert(
          'Error al Agendar',
          responseData.error ||
            'No se pudo registrar la cita. Intenta de nuevo.',
        );
      }
    } catch (error: any) {
      console.error('Error de red o al procesar la solicitud:', error);
      Alert.alert(
        'Error de Red',
        'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Renderizado ---
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Cargando datos de la barbería...</Text>
      </View>
    );
  }

  if (!barbershop) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>
          No se pudo cargar la información de la barbería.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.barbershopHeader}>
        {barbershop.logo_url ? (
          <Image source={{uri: barbershop.logo_url}} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <MaterialIcons name="store" size={50} color="#bdc3c7" />
          </View>
        )}
        <Text style={styles.barbershopName}>{barbershop.nombre}</Text>
      </View>

      {/* Selección de Barbero */}
      <Text style={styles.sectionTitle}>1. Selecciona un Barbero</Text>
      {barbershop.barberos && barbershop.barberos.length > 0 ? (
        barbershop.barberos.map(barber => (
          <TouchableOpacity
            key={barber.barbero_id} // Usar barbero_id (PK de tabla barberos) para la key
            style={[
              styles.card,
              selectedBarber?.usuario_id === barber.usuario_id &&
                styles.selectedCard,
            ]}
            onPress={() => handleSelectBarber(barber)}>
            {barber.avatar_barbero ? (
              <Image
                source={{uri: barber.avatar_barbero}}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="person" size={30} color="#7f8c8d" />
              </View>
            )}
            <View style={styles.cardTextContainer}>
              <Text style={styles.itemName}>{barber.nombre_barbero}</Text>
              {barber.especialidad && (
                <Text style={styles.itemSubtitle}>{barber.especialidad}</Text>
              )}
            </View>
            {selectedBarber?.usuario_id === barber.usuario_id && (
              <MaterialIcons name="check-circle" size={24} color="#2ecc71" />
            )}
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>
          No hay barberos disponibles en esta barbería.
        </Text>
      )}

      {/* Selección de Servicio(s) */}
      {selectedBarber && (
        <>
          <Text style={styles.sectionTitle}>2. Selecciona Servicio(s)</Text>
          {barbershop.servicios && barbershop.servicios.length > 0 ? (
            barbershop.servicios.map(service => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.card,
                  selectedServices.some(s => s.id === service.id) &&
                    styles.selectedCard,
                ]}
                onPress={() => handleSelectService(service)}>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.itemName}>{service.nombre}</Text>
                  {service.descripcion && (
                    <Text style={styles.itemSubtitle}>
                      {service.descripcion}
                    </Text>
                  )}
                </View>
                <Text style={styles.servicePrice}>
                  Bs {Number(service.precio).toFixed(2)}
                </Text>
                {selectedServices.some(s => s.id === service.id) && (
                  <MaterialIcons
                    name="check-circle"
                    size={24}
                    color="#2ecc71"
                    style={{marginLeft: 10}}
                  />
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No hay servicios disponibles para esta selección.
            </Text>
          )}
        </>
      )}

      {/* Selección de Fecha y Hora */}
      {selectedBarber && selectedServices.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>3. Elige Fecha y Hora</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => showMode('date')}>
              <MaterialIcons name="calendar-today" size={22} color="#3498db" />
              <Text style={styles.dateTimeText}>
                {date.toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => showMode('time')}>
              <MaterialIcons name="access-time" size={22} color="#3498db" />
              <Text style={styles.dateTimeText}>
                {date.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
          </View>

          {showPicker && (
            <DateTimePicker
              value={date}
              mode={pickerMode}
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateTimeChange}
              minimumDate={new Date()} // No se pueden agendar citas en el pasado
              // Podrías añadir lógica para `maximumDate` o filtrar horas no disponibles
            />
          )}

          {/* Notas del Cliente */}
          <Text style={styles.sectionTitle}>
            4. Notas Adicionales (Opcional)
          </Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Ej: Alergias, preferencia de corte específico, etc."
            value={notasCliente}
            onChangeText={setNotasCliente}
            multiline
            numberOfLines={3}
          />

          {/* Botón de Confirmación */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (isSubmitting ||
                !selectedBarber ||
                selectedServices.length === 0) &&
                styles.disabledButton,
            ]}
            onPress={handleConfirmAppointment}
            disabled={
              isSubmitting || !selectedBarber || selectedServices.length === 0
            }>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirmar Cita</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

// --- Estilos ---
const styles = StyleSheet.create({
  container: {
    paddingBottom: 30,
    paddingHorizontal: 15,
    backgroundColor: '#F4F0E8',
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  barbershopHeader: {
    alignItems: 'center',
    marginVertical: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#3498db',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dfe6e9',
  },
  barbershopName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#2c3e50',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 20,
    color: '#34495e',
  },
  emptyText: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginVertical: 15,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  selectedCard: {
    backgroundColor: '#e8f4fd',
    borderColor: '#3498db',
    borderWidth: 1.5,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#dfe6e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },
  servicePrice: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#27ae60',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    justifyContent: 'center',
  },
  dateTimeText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#34495e',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#333',
    marginBottom: 20,
  },
  confirmButton: {
    backgroundColor: '#222',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10, // Reducido margen superior
    marginHorizontal: 10, // Pequeño margen horizontal
  },
  disabledButton: {
    backgroundColor: '#a4b0be',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default CitaScreen;
