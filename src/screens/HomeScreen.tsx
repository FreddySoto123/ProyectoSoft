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
  Platform,
  Alert,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type RootStackParamList = {
  Home: {userId: string; name: string};
  Profile: {userId: string};
  AppointmentsScreen: {userId: number};
  ImageCaptureScreen: {userId: string};
  CitaScreen: {
    user: {
      id: number;
      name?: string;
      avatar?: string | null;
    };
    barberiaId: number;
    barberoId?: number;
  };
  FaceShapeScreen: {userId: string; currentFaceShape?: string | null};
};

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;
const DEFAULT_BARBERSHOP_ID = 1;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();
  const userId = route.params?.userId;
  const name = route.params?.name;

  const menuItems = [
    {
      id: '1',
      title: 'Agendar una Cita',
      screen: 'CitaScreen',
      iconName: 'plus-circle',
    },
    {
      id: '2',
      title: 'Mis Citas',
      screen: 'AppointmentsScreen',
      iconName: 'calendar',
    },
    {
      id: '3',
      title: 'Simulación de cortes con IA',
      iconName: 'robot-happy-outline',
      screen: 'ImageCaptureScreen',
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

    if (!userId) {
      Alert.alert('Error', 'No se pudo identificar al usuario.');
      console.error(
        `HomeScreen: userId es undefined, no se puede navegar a ${screenName}`,
      );
      return;
    }
    const numericUserId = Number(userId);
    if (isNaN(numericUserId)) {
      Alert.alert('Error', 'ID de usuario inválido.');
      return;
    }
    switch (screenName) {
      case 'FaceShapeScreen':
      case 'ImageCaptureScreen':
        navigation.navigate(screenName, {userId});
        break;

      case 'Profile':
        navigation.navigate('Profile', {userId});
        break;

      case 'CitaScreen': // <--- CASO ESPECÍFICO PARA AGENDAR CITA
        navigation.navigate('CitaScreen', {
          user: {
            id: numericUserId,
            name: name, // Pasa el nombre del usuario
            // avatar: avatar // Pasa el avatar del usuario si CitaScreen lo necesita/muestra
          },
          barberiaId: DEFAULT_BARBERSHOP_ID, // ID de la barbería predeterminada
          // barberoId: undefined, // O un ID de barbero predeterminado si quieres
        });
        break;

      case 'AppointmentsScreen':
        navigation.navigate('AppointmentsScreen', {userId: Number(userId)});
        break;

      default:
        navigation.navigate(screenName);
        break;
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
              onPress={() => handleMenuItemPress(item.screen, item.title)}>
              <View style={styles.menuIconContainer}>
                <MaterialCommunityIcons
                  name={item.iconName}
                  size={48}
                  color="#000000"
                />
              </View>

              <Text style={styles.menuCardText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F0E8',
  },
  customHeader: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 15 : 50,
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
    width: '48%',
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
    minHeight: 160,
  },
  menuIconContainer: {
    marginBottom: 15,
  },
  iconPlaceholder: {
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
