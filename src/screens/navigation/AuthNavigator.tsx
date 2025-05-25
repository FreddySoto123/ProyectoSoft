// AuthNavigator.tsx o como lo llames (ej. AppNavigator.tsx)
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

// Importa TODAS tus pantallas
import LoginScreen from '../LoginScreen'; // Ajusta la ruta si es '../screens/LoginScreen'
import RegisterScreen from '../RegisterScreen'; // Ajusta la ruta
import HomeScreen from '../HomeScreen'; // Ajusta la ruta
import ServicesScreen from '../ServicesScreen'; // Ajusta la ruta
import SimulationScreen from '../SimulationScreen'; // Ajusta la ruta
import ProfileScreen from '../ProfileScreen'; // Ajusta la ruta
import SelectBarbershopScreen from '../SelectBarbershopScreen'; // Ajusta la ruta
import BarbershopDetailScreen from '../BarbershopDetailScreen'; // Ajusta la ruta
import BarberProfileScreen from '../BarberProfileScreen'; // <--- IMPORTA LA NUEVA PANTALLA (Ajusta la ruta)
import FaceShapeScreen from '../FaceShapeScreen';

// Define tu RootStackParamList incluyendo TODAS las rutas y sus parámetros
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: {userId: string; name: string};
  Services: undefined;
  Simulation: undefined;
  Profile: {userId: string};
  SelectBarbershop: undefined;
  BarbershopDetail: {barbershopId: number | string; barbershopName: string};
  BarberProfile: {barberUserId: number | string; barberName: string};
  FaceShapeScreen: {userId: string; currentFaceShape?: string | null}; // Debe coincidir  // Añade otras rutas que necesites aquí
};

// Crea el Stack Navigator con el tipado
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
    </Stack.Navigator>
  </NavigationContainer>
);

export default AuthNavigator;
