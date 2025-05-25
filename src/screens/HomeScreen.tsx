// HomeScreen.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform, // Asegúrate de importar Platform
  Alert, // Para el caso de error si no hay userId
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

// Define tus tipos de navegación
type RootStackParamList = {
  Home: {userId: string; name: string};
  Profile: {userId: string};
  SelectBarbershop: undefined;
  AppointmentsScreen: undefined;
  SimulationScreen: undefined;
  FaceShapeScreen: {userId: string; currentFaceShape?: string | null}; // Parámetros definidos aquí
  // ... otras rutas
};

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();

  // IMPORTANTE: Asegurarse de que `route.params` no sea undefined
  // y que userId y name existan.
  // Podrías querer manejar un caso donde no llegan, aunque no debería si la navegación a Home es correcta.
  const userId = route.params?.userId; // Usar optional chaining
  const name = route.params?.name; // Usar optional chaining

  const menuItems = [
    {
      id: '1',
      title: 'Encuentra tu Barbería',
      screen: 'SelectBarbershop',
      iconName: 'store-search-outline',
    },
    {
      id: '2',
      title: 'Citas',
      screen: 'AppointmentsScreen',
      iconName: 'calendar-check-outline',
    },
    {
      id: '3',
      title: 'Simulación de cortes con IA',
      screen: 'SimulationScreen',
      iconName: 'robot-happy-outline',
    },
    {
      id: '4',
      title: 'Forma de mi Rostro',
      screen: 'FaceShapeScreen',
      iconName: 'face-recognition',
    },
  ];

  const handleMenuItemPress = (
    screenName: keyof RootStackParamList | undefined,
    itemTitle: string,
  ) => {
    if (!screenName) {
      console.log(`${itemTitle} presionado (sin pantalla definida)`);
      return;
    }

    if (screenName === 'FaceShapeScreen') {
      if (userId) {
        // Asegurarse de que tenemos el userId
        // Aquí puedes obtener la currentFaceShape si la tienes en algún estado global o local
        // Por ahora, la pasaré como null si no la tenemos fácilmente accesible aquí.
        // Si la obtienes de una llamada a API o estado, la lógica iría aquí.
        const userCurrentFaceShape = null; // Ejemplo: Reemplaza esto si tienes la forma actual

        console.log('Navegando a FaceShapeScreen con params:', {
          userId,
          currentFaceShape: userCurrentFaceShape,
        });
        navigation.navigate('FaceShapeScreen', {
          userId: userId,
          currentFaceShape: userCurrentFaceShape,
        });
      } else {
        Alert.alert('Error', 'No se pudo identificar al usuario.');
        console.error(
          'HomeScreen: userId es undefined, no se puede navegar a FaceShapeScreen con parámetros.',
        );
      }
    } else if (screenName === 'Profile') {
      // Ejemplo si tuvieras "Mi Perfil" en menuItems
      if (userId) {
        navigation.navigate('Profile', {userId});
      } else {
        Alert.alert('Error', 'No se pudo identificar al usuario.');
      }
    } else {
      // Para otras pantallas que no necesitan parámetros específicos o cuyos parámetros
      // son opcionales y no se pasan desde aquí.
      // La anotación @ts-ignore podría ser necesaria si TypeScript se queja de que no todas las
      // rutas en RootStackParamList tienen exactamente los mismos parámetros o ninguno.
      // @ts-ignore
      navigation.navigate(screenName);
    }
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      <View style={styles.customHeader}>
        <Text style={styles.headerWelcomeText}>Bienvenido</Text>
        <TouchableOpacity
          onPress={() => {
            if (userId) {
              navigation.navigate('Profile', {userId});
            } else {
              Alert.alert('Error', 'No se pudo identificar al usuario.');
            }
          }}>
          <View style={styles.profileIconPlaceholder}>
            <Text style={{color: '#fff'}}>👤</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Image
          source={require('../../assets/barbersmart-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.welcomeUserText}>
          ¿Cómo estás, {name || 'Usuario'}?
        </Text>

        <View style={styles.menuGrid}>
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuCard}
              onPress={() =>
                handleMenuItemPress(
                  item.screen as keyof RootStackParamList | undefined,
                  item.title,
                )
              }>
              <View style={styles.menuIconContainer}>
                <Text style={styles.iconPlaceholder}>
                  {item.iconName.substring(0, 1).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.menuCardText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// Tus estilos (styles) permanecen igual que antes
// ... (copia y pega tus estilos aquí)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F0E8', // Un color de fondo suave
  },
  customHeader: {
    backgroundColor: '#1A1A1A', // Negro o gris muy oscuro
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 50, // Espacio para la barra de estado
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerWelcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileIconPlaceholder: {
    // Placeholder si no usas react-native-vector-icons aún
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  logo: {
    width: 150,
    height: 150,
    marginTop: 30,
    marginBottom: 20,
  },
  welcomeUserText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 30,
    textAlign: 'center',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    width: '48%', // Para dos tarjetas por fila con un pequeño espacio
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 160, // Para asegurar una altura mínima
  },
  menuIconContainer: {
    marginBottom: 15,
  },
  iconPlaceholder: {
    // Estilo para el placeholder de texto del icono
    fontSize: 30,
    color: '#333',
  },
  menuCardText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
});

export default HomeScreen;
