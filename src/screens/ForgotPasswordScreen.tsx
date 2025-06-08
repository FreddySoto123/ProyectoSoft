// screens/ForgotPasswordScreen.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import emailjs from '@emailjs/browser';
import type {RootStackParamList} from './navigation/AuthNavigator'; // Ajusta la ruta a tu AuthNavigator o donde definas los tipos

// --- CONFIGURACIÓN DE EMAILJS ---
// ¡¡¡REEMPLAZA ESTOS VALORES CON LOS TUYOS!!!
const EMAILJS_SERVICE_ID = 'service_vz7500g';
const EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD = 'template_mfal5yo';
const EMAILJS_PUBLIC_KEY = 'Vrph-H4p97EmcFsCr';

const ForgotPasswordScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      /* ... (validación de email) ... */ return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      /* ... */ return;
    }

    setLoading(true);
    console.log(
      'FORGOT PASSWORD - Solicitando reseteo para email:',
      trimmedEmail,
    );

    try {
      const response = await fetch(
        'http://localhost:3001/api/auth/initiate-password-reset',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email: trimmedEmail}), // Solo enviar email
        },
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Solicitud Enviada',
          data.message ||
            'Si tu correo está registrado, recibirás un código de verificación.',
        );
        navigation.navigate('VerifyCode', {email: trimmedEmail});
      } else {
        Alert.alert(
          'Error',
          data.error || 'No se pudo procesar tu solicitud. Intenta de nuevo.',
        );
      }
    } catch (error: any) {
      console.error('FORGOT PASSWORD - Error de red:', error);
      Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ... (Botón Volver, Title, Subtitle, TextInput para email) ... */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}>
        <Text style={styles.backButtonText}>‹ Volver</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Recuperar Contraseña</Text>
      <Text style={styles.subtitle}>
        Ingresa tu correo electrónico registrado. Te enviaremos un código de 6
        dígitos.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRequestReset}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Enviar Solicitud</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f5f0',
    justifyContent: 'center',
    padding: 25,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 20,
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 23,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
  },
  button: {
    width: '100%',
    backgroundColor: '#222',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#888',
  },
  buttonText: {
    color: '#f9f5f0',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;
