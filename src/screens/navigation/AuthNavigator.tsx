import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../LoginScreen';
import RegisterScreen from '../RegisterScreen';
import HomeScreen from '../HomeScreen';
import ServicesScreen from '../ServicesScreen';
import SimulationScreen from '../SimulationScreen';
import ProfileScreen from '../ProfileScreen';
import SelectBarbershopScreen from '../SelectBarbershopScreen'; // Asegúrate que la ruta sea correcta
import BarbershopDetailScreen from '../BarbershopDetailScreen'; // Necesitarás crear esta pantalla

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: {userId: string; name: string}; // O como lo tengas definido
  Services: undefined;
  Simulation: undefined;
  Profile: {userId: string}; // O como lo tengas definido
  SelectBarbershop: undefined; // Nueva ruta
  BarbershopDetail: {barbershopId: number | string; barbershopName: string}; // Nueva ruta para el detalle
  // Añade otras rutas que necesites
};

const Stack = createNativeStackNavigator();

const AuthNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName="Register">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Services" component={ServicesScreen} />
      <Stack.Screen name="Simulation" component={SimulationScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen
        name="SelectBarbershop"
        component={SelectBarbershopScreen}
        options={{title: 'Encuentra tu Barbería'}} // Título en la barra de navegación
      />
      <Stack.Screen
        name="BarbershopDetail"
        component={BarbershopDetailScreen} // Debes crear este componente
        options={({route}) => ({
          title: route.params.barbershopName || 'Detalles',
        })}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AuthNavigator;
