// frontend/screens/LoginScreen.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  ActivityIndicator, // Para feedback visual
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
// Asume que tienes AsyncStorage para guardar el token y datos del usuario
import AsyncStorage from '@react-native-async-storage/async-storage';

// Asegúrate que RootStackParamList está bien definida y exportada (idealmente en tu archivo de navegación)
// Ejemplo (ajusta según tu estructura):
// import type { RootStackParamList } from '../navigation/AuthNavigator';
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: {userId: string; name: string; rol: string};
  BarberDashboard: {userId: string; name: string; rol: string};
  ForgotPassword: undefined;
  VerifyCode: {email: string};
  ResetPassword: {email: string; code: string};
  SelectBarbershop: undefined;
  BarbershopDetail: {barbershopId: number | string; barbershopName: string};
  BarberProfile: {barberUserId: number | string; barberName: string};
  CitaScreen: {
    barberiaId: number;
    barberoId?: number;
    user: {id: number | string};
  };
  AppointmentsScreen: {userId: number | string | null};
  Services: undefined;
  Simulation: undefined;
  ImageCaptureScreen: {userId: string};
  HairstyleSelectionScreen: {userId: string; userImageUri: string};
  SimulationResultScreen: {
    userId: string;
    userImageUri: string;
    hairstyleId: string | number;
    hairstyleImageUri?: string;
  };
  FaceShapeScreen: {userId: string; currentFaceShape?: string | null};
};

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Para el ActivityIndicator

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        'Campos incompletos',
        'Por favor, ingresa tu correo y contraseña.',
      );
      return;
    }

    setLoading(true);
    console.log('FRONTEND: Intentando iniciar sesión con:', {email, password});

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: email.trim(), password}), // Enviar email sin espacios
      });

      const responseText = await response.text(); // Leer como texto primero para depurar
      console.log(
        'FRONTEND: Respuesta del servidor (texto plano):',
        responseText,
      );
      console.log('FRONTEND: Status de la respuesta:', response.status);

      let data;
      try {
        data = JSON.parse(responseText); // Intentar parsear el texto
        console.log('FRONTEND: Datos de la respuesta (JSON parseado):', data);
      } catch (jsonError) {
        console.error(
          'FRONTEND: Error al parsear JSON de la respuesta:',
          jsonError,
        );
        Alert.alert(
          '❌ Error de respuesta',
          `El servidor respondió con un formato inesperado (Status: ${
            response.status
          }). Contenido: ${responseText.substring(0, 100)}...`,
        );
        setLoading(false);
        return;
      }

      if (
        response.ok &&
        data.user &&
        data.user.id &&
        data.user.rol &&
        data.token
      ) {
        // Login exitoso y la respuesta es la esperada
        console.log(
          'FRONTEND: Login exitoso. Usuario:',
          data.user,
          'Token:',
          data.token,
        );
        Alert.alert('✅ Bienvenido', `Hola, ${data.user.name}!`);

        // Guardar token y datos del usuario en AsyncStorage
        try {
          await AsyncStorage.setItem('@user_token', data.token);
          await AsyncStorage.setItem('@user_data', JSON.stringify(data.user));
          console.log(
            'FRONTEND: Token y datos de usuario guardados en AsyncStorage.',
          );
        } catch (e) {
          console.error('FRONTEND: Error guardando datos en AsyncStorage', e);
          // No bloquear el flujo, pero alertar o loguear
        }

        const userIdStr = String(data.user.id);

        if (data.user.rol === 'Barbero') {
          console.log(
            'FRONTEND: Usuario es Barbero, navegando a BarberDashboard',
          );
          navigation.replace('BarberDashboard', {
            userId: userIdStr,
            name: data.user.name,
            rol: data.user.rol,
          });
        } else if (
          data.user.rol === 'Cliente' ||
          data.user.rol === 'Administrador'
        ) {
          console.log(
            `FRONTEND: Usuario es ${data.user.rol}, navegando a Home`,
          );
          navigation.replace('Home', {
            userId: userIdStr,
            name: data.user.name,
            rol: data.user.rol,
          });
        } else {
          console.warn(
            'FRONTEND: Rol de usuario no reconocido:',
            data.user.rol,
          );
          Alert.alert(
            'Error de Acceso',
            'Tu tipo de cuenta no tiene una pantalla de inicio configurada.',
          );
        }
      } else {
        // El servidor respondió con un error (4xx, 5xx) o la data no es la esperada
        const errorMessage =
          data?.error ||
          data?.message ||
          `Error desconocido del servidor (Status: ${response.status}).`;
        console.error(
          'FRONTEND: Error del servidor (manejado):',
          errorMessage,
          'Data completa:',
          data,
        );
        Alert.alert('⚠️ Error de Login', errorMessage);
      }
    } catch (error: any) {
      console.error('FRONTEND: Error en handleLogin (catch principal):', error);
      Alert.alert(
        '❌ Error de Conexión',
        'No se pudo conectar con el servidor o ocurrió un error inesperado. Verifica tu conexión a internet.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/barbersmart-logo.png')} // Asegúrate que la ruta es correcta
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Iniciar Sesión</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#888"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity
        onPress={handleForgotPassword}
        style={styles.forgotPasswordLink}>
        <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading} // Deshabilitar botón mientras carga
      >
        {loading ? (
          <ActivityIndicator size="small" color="#f9f5f0" />
        ) : (
          <Text style={styles.buttonText}>Ingresar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}
        style={styles.registerLink}>
        <Text style={styles.registerLinkText}>
          ¿No tienes cuenta? Regístrate
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f5f0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#222',
    marginBottom: 25,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
    fontSize: 16,
    color: '#333',
  },
  button: {
    width: '100%',
    backgroundColor: '#222',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    minHeight: 50, // Para que no cambie de tamaño con el ActivityIndicator
    justifyContent: 'center',
  },
  buttonText: {
    color: '#f9f5f0',
    fontSize: 17,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 25,
  },
  registerLinkText: {
    fontSize: 15,
    color: '#333',
    textDecorationLine: 'underline',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: 5,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#007AFF',
  },
});

export default LoginScreen;