import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

// ... (tus otras importaciones de pantallas) ...
import LoginScreen from '../LoginScreen';
import RegisterScreen from '../RegisterScreen';
import HomeScreen from '../HomeScreen';
import ServicesScreen from '../ServicesScreen';
import SimulationScreen from '../SimulationScreen';
import ProfileScreen from '../ProfileScreen';
import SelectBarbershopScreen from '../SelectBarbershopScreen';
import BarbershopDetailScreen from '../BarbershopDetailScreen';
import BarberProfileScreen from '../BarberProfileScreen';
import FaceShapeScreen from '../FaceShapeScreen';
import ImageCaptureScreen from '../simulation/ImageCaptureScreen';
import HairstyleSelectionScreen from '../simulation/HairstyleSelectionScreen';
import SimulationResultScreen from '../simulation/SimulationResultScreen';
import CitaScreen from '../CitaScreen'; // Asegúrate que la importación es correcta
import AppointmentsScreen from '../AppointmentsScreen';
// Define tu RootStackParamList
export type RootStackParamList = { // Exporta el tipo si lo usas en otros archivos
  Login: undefined;
  Register: undefined;
  Home: {userId: string; name: string};
  Services: undefined;
  Simulation: undefined;
  Profile: {userId: string};
  SelectBarbershop: undefined;
  BarbershopDetail: {barbershopId: number | string; barbershopName: string};
  BarberProfile: {barberUserId: number | string; barberName: string};
  ImageCaptureScreen: {userId: string};
  HairstyleSelectionScreen: {userId: string; userImageUri: string};
  SimulationResultScreen: {
    userId: string;
    userImageUri: string;
    hairstyleId: string | number;
    hairstyleImageUri?: string;
  };
  FaceShapeScreen: {userId: string; currentFaceShape?: string | null};
  CitaScreen: { // El nombre aquí es 'CitaScreen'
    barberiaId: number;
    barberoId: number;
    user: {id: number; nombre: string /* Ajusta el tipo de user según lo que pases */};
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AuthNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName="Register">
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{title: 'Inicio'}}
      />
      <Stack.Screen
        name="Services"
        component={ServicesScreen}
        options={{title: 'Servicios'}}
      />
      <Stack.Screen
        name="Simulation"
        component={SimulationScreen}
        options={{title: 'Simulación de Corte'}}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'Mi Perfil'}}
      />
      <Stack.Screen
        name="SelectBarbershop"
        component={SelectBarbershopScreen}
        options={{title: 'Encuentra tu Barbería'}}
      />
      <Stack.Screen
        name="BarbershopDetail"
        component={BarbershopDetailScreen}
        options={({route}) => ({
          title: route.params.barbershopName || 'Detalles de Barbería',
        })}
      />
      <Stack.Screen
        name="BarberProfile"
        component={BarberProfileScreen}
        options={({route}) => ({
          title: route.params.barberName || 'Perfil del Barbero',
        })}
      />
      <Stack.Screen
        name="FaceShapeScreen"
        component={FaceShapeScreen}
        options={{title: 'Forma de mi Rostro'}}
      />
      <Stack.Screen
        name="ImageCaptureScreen"
        component={ImageCaptureScreen}
        options={{title: 'Simulación IA - Foto'}}
      />
      <Stack.Screen
        name="HairstyleSelectionScreen"
        component={HairstyleSelectionScreen}
        options={{title: 'Simulación IA - Elegir Corte'}}
      />
      <Stack.Screen
        name="SimulationResultScreen"
        component={SimulationResultScreen}
        options={{title: 'Simulación IA - Resultado'}}
      />
      <Stack.Screen
        name="CitaScreen" // <--- CORREGIDO AQUÍ
        component={CitaScreen}
        options={{title: 'Reservar Cita'}}
      />
      <Stack.Screen
  name="AppointmentsScreen"
  component={AppointmentsScreen}
  options={{ title: 'Mis Citas' }}
/>
    </Stack.Navigator>
  </NavigationContainer>
);

export default AuthNavigator;