// screens/BarberProfileScreen.tsx
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

// Define la estructura del objeto BarberProfile que esperas del backend
interface BarberProfileData {
  usuario_id: number | string;
  nombre: string;
  email?: string;
  telefono?: string; // Si lo añades a la tabla 'users' y a la query del backend
  avatar?: string;
  barberia_id?: number | string;
  nombre_barberia?: string;
  especialidad?: string;
  descripcion_profesional?: string;
  calificacion_promedio?: number | string; // Podría ser string desde la BD
  activo?: boolean;
  // Añade aquí campos para horarios, reseñas, etc., si los implementas
  // horarios?: any[];
  // reseñas?: any[];
}

// Tipos para la navegación
type RootStackParamListFromBarberProfile = {
  // ... tus otras rutas
  BarberProfile: {barberUserId: number | string; barberName: string};
  // AppointmentBooking: { barberId: number | string; barbershopId?: number | string };
};

type BarberProfileScreenRouteProp = RouteProp<
  RootStackParamListFromBarberProfile,
  'BarberProfile'
>;
type BarberProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamListFromBarberProfile,
  'BarberProfile'
>;

type Props = {
  route: BarberProfileScreenRouteProp;
  navigation: BarberProfileScreenNavigationProp;
};

const BarberProfileScreen: React.FC<Props> = ({route, navigation}) => {
  const {barberUserId, barberName} = route.params;
  const [barberProfile, setBarberProfile] = useState<BarberProfileData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Opcional: Actualizar el título de la pantalla
    navigation.setOptions({title: barberName || 'Perfil del Barbero'});

    const fetchBarberDetails = async () => {
      setLoading(true);
      setError(null);
      console.log(
        `BARBER PROFILE SCREEN - Fetching profile for barberUserId: ${barberUserId}`,
      );
      try {
        const response = await fetch(
          `http://localhost:3001/api/barbers/profile/${barberUserId}`,
        );
        const data = await response.json();

        if (response.ok) {
          console.log('BARBER PROFILE SCREEN - Profile fetched:', data);
          setBarberProfile(data);
        } else {
          console.error(
            'BARBER PROFILE SCREEN - Error fetching profile (response not ok):',
            data,
          );
          setError(data.error || 'No se pudo cargar el perfil del barbero.');
          Alert.alert(
            'Error',
            data.error || 'No se pudo cargar el perfil del barbero.',
          );
        }
      } catch (e) {
        console.error(
          'BARBER PROFILE SCREEN - Network error fetching profile:',
          e,
        );
        setError('Error de red al cargar el perfil.');
        Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    if (barberUserId) {
      fetchBarberDetails();
    }
  }, [barberUserId, navigation, barberName]);

  if (loading) {
    return (
      <View style={[styles.screenContainer, styles.centerContent]}>
        <ActivityIndicator size="large" color="#333" />
        <Text style={styles.loadingText}>Cargando perfil del barbero...</Text>
      </View>
    );
  }

  if (error || !barberProfile) {
    return (
      <View style={[styles.screenContainer, styles.centerContent]}>
        <Text style={styles.errorText}>
          {error || 'No se encontraron datos del barbero.'}
        </Text>
      </View>
    );
  }

  const handleBookWithBarber = () => {
    Alert.alert(
      'Agendar',
      `Agendar cita con ${barberProfile.nombre}. Funcionalidad próximamente.`,
    );
    // navigation.navigate('AppointmentBooking', {
    //   barberId: barberProfile.usuario_id,
    //   barbershopId: barberProfile.barberia_id // Si tienes la barberia_id aquí
    // });
  };

  return (
    <ScrollView
      style={styles.screenContainer}
      contentContainerStyle={styles.scrollContentContainer}>
      <View style={styles.headerSection}>
        {barberProfile.avatar ? (
          <Image
            source={{uri: barberProfile.avatar}}
            style={styles.avatarImage}
          />
        ) : (
          <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
            <Text style={styles.avatarPlaceholderText}>👤</Text>
          </View>
        )}
        <Text style={styles.barberName}>{barberProfile.nombre}</Text>
        {barberProfile.especialidad && (
          <Text style={styles.barberSpecialty}>
            Especialista en: {barberProfile.especialidad}
          </Text>
        )}
        {barberProfile.nombre_barberia && (
          <Text style={styles.barbershopInfo}>
            Trabaja en: {barberProfile.nombre_barberia}
          </Text>
        )}
      </View>

      {barberProfile.descripcion_profesional && (
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Sobre Mí</Text>
          <Text style={styles.descriptionText}>
            {barberProfile.descripcion_profesional}
          </Text>
        </View>
      )}

      <View style={styles.detailCard}>
        <Text style={styles.sectionTitle}>Información de Contacto</Text>
        <IconText icon="✉️" text={barberProfile.email} />
        {barberProfile.telefono && (
          <IconText icon="📞" text={barberProfile.telefono} />
        )}
        {/* Aquí podrías añadir más info si la tienes */}
      </View>

      {/* Aquí podrías añadir secciones para:
          - Horarios del barbero
          - Reseñas
          - Galería de trabajos/portafolio
      */}
      <View style={styles.detailCard}>
        <Text style={styles.sectionTitle}>Calificación</Text>
        <Text style={styles.ratingText}>
          {barberProfile.calificacion_promedio
            ? `${Number(barberProfile.calificacion_promedio).toFixed(1)} ⭐`
            : 'Aún sin calificar'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.bookButton}
        onPress={handleBookWithBarber}>
        <Text style={styles.bookButtonText}>
          Agendar con {barberProfile.nombre.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// Componente IconText (puedes moverlo a un archivo utils si lo reusas)
const IconText: React.FC<{icon: string; text?: string; style?: object}> = ({
  icon,
  text,
  style,
}) =>
  text ? (
    <View style={styles.iconTextContainer}>
      <Text style={[styles.iconStyle, style]}>{icon}</Text>
      <Text style={[styles.infoText, style]}>{text}</Text>
    </View>
  ) : null;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  scrollContentContainer: {
    paddingBottom: 30,
  },
  centerContent: {
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
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  headerSection: {
    backgroundColor: '#ffffff', // Puedes usar un color o imagen de fondo aquí
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#333', // O un color que combine con tu tema
    backgroundColor: '#e0e0e0',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ccc',
  },
  avatarPlaceholderText: {
    fontSize: 60,
    color: '#fff',
  },
  barberName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  barberSpecialty: {
    fontSize: 17,
    color: '#3498db', // Un color para destacar la especialidad
    marginBottom: 5,
  },
  barbershopInfo: {
    fontSize: 15,
    color: '#7f8c8d',
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 15,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#555',
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconStyle: {
    fontSize: 20,
    marginRight: 12,
    color: '#555',
  },
  infoText: {
    fontSize: 16,
    color: '#444',
    flexShrink: 1,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f39c12', // Color para rating (ej. amarillo/naranja)
  },
  bookButton: {
    backgroundColor: '#2c3e50',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 15,
    marginTop: 30,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BarberProfileScreen;
