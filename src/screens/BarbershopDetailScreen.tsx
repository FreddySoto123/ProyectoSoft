// screens/BarbershopDetailScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

// Define la estructura de los objetos que esperas del backend
interface Service {
  id: number | string;
  nombre: string;
  precio: string | number; // Podría ser string si viene formateado, o number
  descripcion?: string;
  duracion_estimada_minutos?: number;
}

interface Barber {
  usuario_id: number | string; // ID del usuario
  nombre_barbero: string;
  especialidad?: string;
  avatar_barbero?: string; // URL del avatar del barbero
  // otros campos del barbero que quieras mostrar
}

interface BarbershopDetails {
  id: number | string;
  nombre: string;
  direccion?: string;
  logo_url?: string;
  descripcion?: string;
  horario_apertura?: string;
  horario_cierre?: string;
  dias_laborales?: string;
  telefono_contacto?: string;
  email_contacto?: string;
  servicios: Service[];
  barberos: Barber[];
}

// Tipos para la navegación
type RootStackParamList = {
  // ... tus otras rutas
  BarbershopDetail: {barbershopId: number | string; barbershopName: string};
  // AppointmentBooking: { barbershopId: number | string; serviceId?: string; barberId?: string }; // Ejemplo para futura navegación
};

type BarbershopDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'BarbershopDetail'
>;
type BarbershopDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'BarbershopDetail'
>;

type Props = {
  route: BarbershopDetailScreenRouteProp;
  navigation: BarbershopDetailScreenNavigationProp;
};

const BarbershopDetailScreen: React.FC<Props> = ({route, navigation}) => {
  const {barbershopId, barbershopName} = route.params;
  const [barbershop, setBarbershop] = useState<BarbershopDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Actualizar el título de la pantalla si no se hizo en el navigator
    // navigation.setOptions({ title: barbershopName || 'Detalles de Barbería' });

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      console.log(
        `BARBERSHOP DETAIL SCREEN - Fetching details for barbershopId: ${barbershopId}`,
      );
      try {
        const response = await fetch(
          `http://localhost:3001/api/barbershops/${barbershopId}`,
        );
        const data = await response.json();

        if (response.ok) {
          console.log('BARBERSHOP DETAIL SCREEN - Details fetched:', data);
          setBarbershop(data);
        } else {
          console.error(
            'BARBERSHOP DETAIL SCREEN - Error fetching details (response not ok):',
            data,
          );
          setError(data.error || 'No se pudieron cargar los detalles.');
          Alert.alert(
            'Error',
            data.error || 'No se pudieron cargar los detalles.',
          );
        }
      } catch (e) {
        console.error(
          'BARBERSHOP DETAIL SCREEN - Network error fetching details:',
          e,
        );
        setError('Error de red al cargar detalles.');
        Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [barbershopId, navigation, barbershopName]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#000" />
        <Text>Cargando detalles...</Text>
      </View>
    );
  }

  if (error || !barbershop) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>
          {error || 'No se encontraron datos de la barbería.'}
        </Text>
      </View>
    );
  }

  // Función para navegar a la pantalla de agendar cita (necesitarás crearla)
  const handleBookAppointment = (service?: Service, barber?: Barber) => {
    console.log('Intentando agendar cita con:', {
      barbershopId: barbershop.id,
      service,
      barber,
    });
    // navigation.navigate('AppointmentBooking', {
    //   barbershopId: barbershop.id,
    //   serviceId: service?.id,
    //   barberId: barber?.usuario_id
    // });
    Alert.alert(
      'Próximamente',
      'Funcionalidad de agendar cita aún no implementada.',
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContentContainer}>
      {barbershop.logo_url && (
        <Image
          source={{uri: barbershop.logo_url}}
          style={styles.logo}
          resizeMode="contain"
        />
      )}
      <Text style={styles.barbershopName}>{barbershop.nombre}</Text>

      {barbershop.direccion && (
        <Text style={styles.infoText}>
          <Text style={styles.infoLabel}>Dirección:</Text>{' '}
          {barbershop.direccion}
        </Text>
      )}
      {barbershop.telefono_contacto && (
        <Text style={styles.infoText}>
          <Text style={styles.infoLabel}>Teléfono:</Text>{' '}
          {barbershop.telefono_contacto}
        </Text>
      )}
      {barbershop.email_contacto && (
        <Text style={styles.infoText}>
          <Text style={styles.infoLabel}>Email:</Text>{' '}
          {barbershop.email_contacto}
        </Text>
      )}
      {barbershop.dias_laborales && (
        <Text style={styles.infoText}>
          <Text style={styles.infoLabel}>Días:</Text>{' '}
          {barbershop.dias_laborales}
        </Text>
      )}
      {barbershop.horario_apertura && barbershop.horario_cierre && (
        <Text style={styles.infoText}>
          <Text style={styles.infoLabel}>Horario:</Text>{' '}
          {barbershop.horario_apertura.substring(0, 5)} -{' '}
          {barbershop.horario_cierre.substring(0, 5)}
        </Text>
      )}
      {barbershop.descripcion && (
        <Text style={styles.description}>{barbershop.descripcion}</Text>
      )}

      {/* Sección de Servicios */}
      <Text style={styles.sectionTitle}>Servicios</Text>
      {barbershop.servicios && barbershop.servicios.length > 0 ? (
        barbershop.servicios.map(service => (
          <TouchableOpacity
            key={service.id}
            style={styles.listItem}
            onPress={() => handleBookAppointment(service)}>
            <View style={styles.listItemContent}>
              <Text style={styles.itemName}>{service.nombre}</Text>
              {service.descripcion && (
                <Text style={styles.itemDescription}>
                  {service.descripcion}
                </Text>
              )}
            </View>
            <View style={styles.listItemPriceContainer}>
              <Text style={styles.itemPrice}>
                Bs {Number(service.precio).toFixed(2)}
              </Text>
              {service.duracion_estimada_minutos && (
                <Text style={styles.itemDuration}>
                  {service.duracion_estimada_minutos} min
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>
          No hay servicios disponibles en esta barbería.
        </Text>
      )}

      {/* Sección de Barberos */}
      <Text style={styles.sectionTitle}>Barberos</Text>
      {barbershop.barberos && barbershop.barberos.length > 0 ? (
        barbershop.barberos.map(barber => (
          <TouchableOpacity
            key={barber.usuario_id}
            style={styles.listItemBarber}
            onPress={() => handleBookAppointment(undefined, barber)}>
            {barber.avatar_barbero ? (
              <Image
                source={{uri: barber.avatar_barbero}}
                style={styles.barberAvatar}
              />
            ) : (
              <View style={[styles.barberAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarPlaceholderText}>👤</Text>
              </View>
            )}
            <View style={styles.barberInfo}>
              <Text style={styles.itemName}>{barber.nombre_barbero}</Text>
              {barber.especialidad && (
                <Text style={styles.itemDescription}>
                  {barber.especialidad}
                </Text>
              )}
            </View>
            {/* Podrías añadir un botón "Seleccionar" o "Ver Horarios" */}
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>
          No hay barberos asignados a esta barbería.
        </Text>
      )}

      <TouchableOpacity
        style={styles.bookButton}
        onPress={() => handleBookAppointment()}>
        <Text style={styles.bookButtonText}>Agendar Cita General</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f5f0',
  },
  scrollContentContainer: {
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: '80%',
    height: 150,
    alignSelf: 'center',
    marginBottom: 20,
    borderRadius: 10,
  },
  barbershopName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 5,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#333',
  },
  description: {
    fontSize: 15,
    color: '#555',
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 22,
    textAlign: 'justify',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 25,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
  },
  listItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  listItemContent: {
    flex: 1,
  },
  listItemPriceContainer: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  itemDescription: {
    fontSize: 13,
    color: '#777',
    marginTop: 3,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00796b', // Un color para el precio
  },
  itemDuration: {
    fontSize: 12,
    color: '#888',
  },
  listItemBarber: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  barberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: '#e0e0e0',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 24,
    color: '#aaa',
  },
  barberInfo: {
    flex: 1,
  },
  emptyText: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  bookButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BarbershopDetailScreen;
