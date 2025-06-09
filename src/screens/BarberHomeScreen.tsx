import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './navigation/AuthNavigator'; // Ajusta la ruta

type BarberHomeScreenRouteProp = RouteProp<RootStackParamList, 'BarberHomeScreen'>; // Cambiar nombre en RootStackParamList
type BarberHomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BarberHomeScreen'>;

interface Props {
  route: BarberHomeScreenRouteProp;
  navigation: BarberHomeScreenNavigationProp;
}

const BarberHomeScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId, name: barberName, rol } = route.params;

  const goToAppointments = () => {
    navigation.navigate('BarberAppointmentsList', { barberUserId: userId, barberName });
  };

  const goToProfile = () => {
    navigation.navigate('Profile', { userId });
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Home</Text>
          <TouchableOpacity onPress={goToProfile}>
            {/* Aquí podrías poner un ícono de perfil o la imagen del barbero */}
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.welcomeText}>Bienvenido</Text>
          <Image
            source={require('../../assets/barbersmart-logo.png')} // Ajusta la ruta a tu logo
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.greetingText}>¿Cómo estás, {barberName}?</Text>

          <TouchableOpacity style={styles.appointmentsButton} onPress={goToAppointments}>
            <Text style={styles.appointmentsButtonIcon}>🗓️</Text>
            <Text style={styles.appointmentsButtonText}>Citas</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f0e8', // Un fondo claro
  },
  header: {
    backgroundColor: '#1A1A1A', // Negro o gris oscuro
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 25, // Espacio para la barra de estado
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileIcon: {
    fontSize: 24, // Ajusta según el ícono o imagen
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginVertical: 20,
  },
  greetingText: {
    fontSize: 20,
    color: '#555',
    marginBottom: 40,
    textAlign: 'center',
  },
  appointmentsButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 15,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: 150, // Ancho fijo para el botón
    height: 120, // Alto fijo
  },
  appointmentsButtonIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  appointmentsButtonText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
});

export default BarberHomeScreen;