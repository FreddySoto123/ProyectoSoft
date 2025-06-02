import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

// 👇 Tipado de las rutas
type RootStackParamList = {
  Login: undefined;
  Home: {name: string};
};

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogin = async () => {
    console.log('Intentando iniciar sesión con:', {email, password}); // LOG 1: Datos de entrada
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
      });

      console.log('Respuesta del servidor (status):', response.status); // LOG 2: Status de la respuesta

      // Es importante intentar parsear el JSON incluso si response.ok es false,
      // porque el servidor podría enviar un mensaje de error en el cuerpo JSON.
      let data;
      try {
        data = await response.json();
        console.log('Datos de la respuesta (JSON):', data); // LOG 3: Cuerpo de la respuesta JSON
      } catch (jsonError) {
        // Si falla el .json(), es probable que la respuesta no sea JSON (ej. HTML de error 500 o texto plano)
        console.error('Error al parsear JSON de la respuesta:', jsonError); // LOG 4: Error parseando JSON
        const textResponse = await response.text(); // Intentar leer como texto para ver qué llegó
        console.log('Respuesta del servidor (texto plano):', textResponse); // LOG 5: Cuerpo como texto
        Alert.alert(
          '❌ Error de respuesta',
          `El servidor respondió con un formato inesperado (Status: ${response.status}). Intenta más tarde.`,
        );
        return; // Salir de la función si no se pudo parsear el JSON
      }

      if (response.ok) {
        // status está en el rango 200-299
        Alert.alert('✅ Bienvenido', `${data.user.name}`);
        navigation.navigate('Home', {
          userId: data.user.id,
          name: data.user.name,
        });
      } else {
        // Errores del servidor (4xx, 5xx) donde el cuerpo SÍ fue JSON
        console.error(
          'Error del servidor (manejado):',
          data.error || data.message || 'Error desconocido del servidor',
        ); // LOG 6: Error específico del servidor
        Alert.alert(
          '⚠️ Error',
          data.error || data.message || `Error ${response.status}`,
        );
      }
    } catch (error) {
      // Este catch se activa por errores de red (no se puede conectar)
      // o si algo falla ANTES o DESPUÉS de la llamada a fetch pero DENTRO del try principal
      // (ej. un error en navigation.navigate, aunque es menos probable aquí).
      console.error('Error en handleLogin (catch principal):', error); // LOG 7: Error de red o similar
      Alert.alert(
        '❌ Error de red',
        'No se pudo conectar con el servidor o ocurrió un error inesperado.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/barbersmart-logo.png')}
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
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Ingresar</Text>
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
    marginBottom: 20,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    color: '#000',
  },
  button: {
    width: '100%',
    backgroundColor: '#222',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonText: {
    color: '#f9f5f0',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
