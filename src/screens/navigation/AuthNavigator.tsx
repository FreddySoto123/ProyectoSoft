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
import AppointmentDetailScreen from '../AppointmentDetailScreen';
import BarberAppointmentDetailScreen from '../BarberAppointmentDetailScreen';
import CitaScreen from '../CitaScreen'; // Asegúrate que la importación es correcta
import AppointmentsScreen from '../AppointmentsScreen';
import BarberDashboardScreen from '../BarberDashboardScreen';
import ForgotPasswordScreen from '../ForgotPasswordScreen';
import VerifyCodeScreen from '../VerifyCodeScreen';
import ResetPasswordScreen from '../ResetPasswordScreen';
// Define tu RootStackParamList
export type RootStackParamList = {
  // Exporta el tipo si lo usas en otros archivos
  Login: undefined;
  ForgotPassword: undefined;
  VerifyCode: {email: string};
  ResetPassword: {email: string; code: string};
  Register: undefined;
  BarberDashboard: {userId: string; name: string; rol: string};
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
  CitaScreen: {
    user: {id: number; name?: string; avatar?: string | null};
    barberiaId: number;
    barberoId?: number;
  };
  AppointmentsScreen: {userId: number | string};
  AppointmentList: {userId: string};
  BarberAppointmentList: {barberUserId: string};
  AppointmentDetail: {cita: CitaConDetalles};
  BarberAppointmentDetail: {cita: CitaParaBarbero; onGoBack?: () => void};
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
        options={{title: 'Mis Citas'}}
        initialParams={{userId: null}} // o undefined
      />
      <Stack.Screen
        name="BarberDashboard"
        component={BarberDashboardScreen}
        options={{title: 'Panel de Barbero' /* , headerLeft: () => null */}}
      />

      <Stack.Screen
        name="AppointmentDetail"
        component={AppointmentDetailScreen}
        options={{title: 'Detalle de Cita'}}
      />
      <Stack.Screen
        name="BarberAppointmentDetail"
        component={BarberAppointmentDetailScreen}
        options={{title: 'Gestionar Cita'}}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{title: 'Recuperar Contraseña'}}
      />
      <Stack.Screen
        name="VerifyCode"
        component={VerifyCodeScreen}
        options={{title: 'Verificar Código'}}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{title: 'Nueva Contraseña'}}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AuthNavigator;
