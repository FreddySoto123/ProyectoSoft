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
  Dimensions, // Para obtener el ancho de la pantalla
} from 'react-native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

// (Tus interfaces Service, Barber, BarbershopDetails y tipos de navegación permanecen igual)
interface Service {
  id: number | string;
  nombre: string;
  precio: string | number;
  descripcion?: string;
  duracion_estimada_minutos?: number;
}

interface Barber {
  usuario_id: number | string;
  nombre_barbero: string;
  especialidad?: string;
  avatar_barbero?: string;
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

type RootStackParamList = {
  BarbershopDetail: {barbershopId: number | string; barbershopName: string};
  BarberProfile: {barberUserId: number | string; barberName: string}; // <--- NUEVA RUTA
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

// Un componente simple para íconos (puedes reemplazarlo con react-native-vector-icons)
const IconText: React.FC<{icon: string; text?: string; style?: object}> = ({
  icon,
  text,
  style,
}) =>
  text ? (
    <View style={styles.iconTextContainer}>
      <Text style={[styles.iconStyle, style]}>{icon}</Text>
      <Text style={[styles.infoText, style, styles.iconTextText]}>{text}</Text>
    </View>
  ) : null;

const BarbershopDetailScreen: React.FC<Props> = ({route, navigation}) => {
  const {barbershopId, barbershopName} = route.params;
  const [barbershop, setBarbershop] = useState<BarbershopDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      // ... (tu lógica de fetchDetails permanece igual) ...
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `http://192.168.1.210:3001/api/barbershops/${barbershopId}`,
        );
        const data = await response.json();
        if (response.ok) {
          setBarbershop(data);
        } else {
          setError(data.error || 'No se pudieron cargar los detalles.');
          Alert.alert(
            'Error',
            data.error || 'No se pudieron cargar los detalles.',
          );
        }
      } catch (e) {
        setError('Error de red al cargar detalles.');
        Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [barbershopId]);

  if (loading) {
    return (
      <View style={[styles.screenContainer, styles.centerContent]}>
        <ActivityIndicator size="large" color="#333" />
        <Text style={styles.loadingText}>Cargando detalles...</Text>
      </View>
    );
  }

  if (error || !barbershop) {
    return (
      <View style={[styles.screenContainer, styles.centerContent]}>
        <Text style={styles.errorText}>
          {error || 'No se encontraron datos de la barbería.'}
        </Text>
      </View>
    );
  }

const handleBookAppointment = (service?: Service, barber?: Barber) => {
  if (!barbershop) return;

  if (barbershop.barberos.length > 0) {
    const selectedBarbero = barbershop.barberos[0]; // Puedes permitir seleccionar después
    navigation.navigate('CitaScreen', {
      user: { id: 1 }, // ⚠️ Ajusta con el usuario real autenticado
      barberiaId: Number(barbershop.id),
      barberoId: Number(selectedBarbero.usuario_id),
    });
  } else {
    Alert.alert("No hay barberos disponibles.");
  }
};

  return (
    <ScrollView
      style={styles.screenContainer}
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={false}>
      {/* Imagen de Portada / Logo */}
      {barbershop.logo_url ? (
        <Image
          source={{uri: barbershop.logo_url}}
          style={styles.headerImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.headerImage, styles.headerImagePlaceholder]}>
          <Text style={styles.headerImagePlaceholderText}>💈</Text>
        </View>
      )}

      <View style={styles.contentCard}>
        <Text style={styles.barbershopName}>{barbershop.nombre}</Text>

        {barbershop.descripcion && (
          <Text style={styles.description}>{barbershop.descripcion}</Text>
        )}

        <View style={styles.infoSection}>
          <IconText icon="📍" text={barbershop.direccion} />
          <IconText icon="📞" text={barbershop.telefono_contacto} />
          <IconText icon="✉️" text={barbershop.email_contacto} />
          <IconText icon="🗓️" text={barbershop.dias_laborales} />
          {barbershop.horario_apertura && barbershop.horario_cierre && (
            <IconText
              icon="⏰"
              text={`${barbershop.horario_apertura.substring(
                0,
                5,
              )} - ${barbershop.horario_cierre.substring(0, 5)}`}
            />
          )}
        </View>
      </View>

      {/* Sección de Servicios */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Nuestros Servicios</Text>
        {barbershop.servicios && barbershop.servicios.length > 0 ? (
          barbershop.servicios.map(service => (
            <TouchableOpacity
              key={`service-${service.id}`}
              style={styles.cardItem}
              onPress={() => handleBookAppointment(service)}>
              <View style={styles.cardItemTextContainer}>
                <Text style={styles.cardItemName}>{service.nombre}</Text>
                {service.descripcion && (
                  <Text style={styles.cardItemDescription}>
                    {service.descripcion}
                  </Text>
                )}
                {service.duracion_estimada_minutos && (
                  <Text style={styles.itemDuration}>
                    Duración: {service.duracion_estimada_minutos} min
                  </Text>
                )}
              </View>
              <Text style={styles.itemPrice}>
                Bs {Number(service.precio).toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No hay servicios disponibles.</Text>
        )}
      </View>

      {/* Sección de Barberos */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Nuestro Equipo</Text>
        {barbershop.barberos && barbershop.barberos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}>
            {barbershop.barberos.map(barber => (
              <TouchableOpacity
                key={`barber-${barber.usuario_id}`}
                style={styles.barberCard}
                onPress={() =>
                  navigation.navigate('BarberProfile', {
                    // <--- CAMBIO AQUÍ
                    barberUserId: barber.usuario_id, // Pasar el ID del usuario del barbero
                    barberName: barber.nombre_barbero, // Pasar el nombre para el título de la siguiente pantalla
                  })
                }>
                {barber.avatar_barbero ? (
                  <Image
                    source={{uri: barber.avatar_barbero}}
                    style={styles.barberAvatar}
                  />
                ) : (
                  <View style={[styles.barberAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarPlaceholderTextBig}>👤</Text>
                  </View>
                )}
                <Text style={styles.barberName}>{barber.nombre_barbero}</Text>
                {barber.especialidad && (
                  <Text style={styles.barberSpecialty}>
                    {barber.especialidad}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>No hay barberos asignados.</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.bookButton}
        onPress={() => handleBookAppointment()}>
        <Text style={styles.bookButtonText}>Agendar una Cita</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0', // Un gris más claro para el fondo general
  },
  scrollContentContainer: {
    paddingBottom: 40, // Espacio al final del scroll
  },
  centerContent: {
    flex: 1, // Asegura que ocupe toda la pantalla para centrar
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  headerImage: {
    width: '100%',
    height: 220, // Altura mayor para la imagen de portada
    backgroundColor: '#ccc', // Color mientras carga la imagen
  },
  headerImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  headerImagePlaceholderText: {
    fontSize: 80,
    color: '#bbb',
  },
  contentCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginHorizontal: 15,
    marginTop: -50, // Solapar ligeramente con la imagen de header
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    marginBottom: 20,
  },
  barbershopName: {
    fontSize: 28,
    fontWeight: 'bold', // '700' es más específico
    color: '#2c3e50', // Un azul oscuro/gris
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 15,
    color: '#555f61', // Gris más suave
    lineHeight: 23,
    textAlign: 'center', // O 'justify'
    marginBottom: 20,
  },
  infoSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconStyle: {
    fontSize: 18, // Tamaño del ícono (emoji)
    marginRight: 10,
    color: '#3498db', // Un color para los íconos
  },
  infoText: {
    fontSize: 16,
    color: '#34495e', // Gris oscuro para el texto de info
    flexShrink: 1, // Para que el texto se ajuste si es muy largo
  },
  iconTextText: {
    // Estilo adicional para el texto junto al ícono si es necesario
    // Por ejemplo, si quieres diferenciarlo más
  },

  sectionContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginHorizontal: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 18,
    // borderBottomWidth: 1,
    // borderBottomColor: '#e0e0e0',
    // paddingBottom: 8,
  },
  cardItem: {
    backgroundColor: '#f9f9f9', // Un fondo ligero para cada item de servicio
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardItemTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  cardItemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  cardItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60', // Verde para el precio
  },
  itemDuration: {
    fontSize: 13,
    color: '#7f8c8d', // Gris para la duración
    marginTop: 3,
    textAlign: 'right',
  },

  // Estilos para barberos
  horizontalScroll: {
    paddingVertical: 10,
  },
  barberCard: {
    backgroundColor: '#fdfdfd',
    borderRadius: 10,
    padding: 15,
    marginRight: 15,
    alignItems: 'center',
    width: 140, // Ancho fijo para las tarjetas de barbero
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  barberAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    backgroundColor: '#e0e0e0',
  },
  avatarPlaceholder: {
    // Reutilizado de la pantalla anterior
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderTextBig: {
    // Para el placeholder de barbero más grande
    fontSize: 40,
    color: '#bfbfbf',
  },
  barberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  barberSpecialty: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 15,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c', // Rojo para errores
    textAlign: 'center',
  },
  bookButton: {
    backgroundColor: '#2c3e50', // Color primario oscuro
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 15,
    marginTop: 10, // Reducido el margen superior
    marginBottom: 20,
    elevation: 3,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BarbershopDetailScreen;
