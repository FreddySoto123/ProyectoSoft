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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// 👇 Tipado de las rutas
type RootStackParamList = {
  Login: undefined;
<<<<<<< HEAD
  Home: { name: string };
=======
  Home: { userId: string; name: string };
>>>>>>> 4640940 (cambio por tiempo)
};

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogin = async () => {
    try {
<<<<<<< HEAD
      const response = await fetch('http://192.168.1.204:3001/api/auth/login', {
=======
      const response = await fetch('http://192.168.1.202:3001/api/auth/login', {
>>>>>>> 4640940 (cambio por tiempo)
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('✅ Bienvenido', `${data.user.name}`);
        navigation.navigate('Home', { name: data.user.name });
      } else {
        Alert.alert('⚠️ Error', data.message || data.error);
      }
    } catch (error) {
      Alert.alert('❌ Error de red', 'No se pudo conectar con el servidor.');
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
