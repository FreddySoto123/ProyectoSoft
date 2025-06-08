// screens/ResetPasswordScreen.tsx
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
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from './navigation/AuthNavigator'; // Ajusta la ruta

type ResetPasswordScreenRouteProp = RouteProp<
  RootStackParamList,
  'ResetPassword'
>;

const ResetPasswordScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ResetPasswordScreenRouteProp>();
  const {email, code} = route.params; // Email y código ya validado

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert(
        'Campos Vacíos',
        'Por favor, ingresa y confirma tu nueva contraseña.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Contraseñas no Coinciden',
        'Las contraseñas ingresadas no son iguales.',
      );
      return;
    }
    if (newPassword.length < 6) {
      // O tu validación de longitud
      Alert.alert(
        'Contraseña Corta',
        'La contraseña debe tener al menos 6 caracteres.',
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        'http://localhost:3001/api/auth/reset-password-with-code',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email, code, newPassword}),
        },
      );
      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Contraseña Actualizada',
          'Tu contraseña ha sido cambiada exitosamente. Por favor, inicia sesión con tu nueva contraseña.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.popToTop(); // Vuelve al inicio del stack (probablemente Login)
                navigation.navigate('Login'); // Asegura que esté en Login
              },
            },
          ],
        );
      } else {
        Alert.alert(
          'Error al Restablecer',
          data.error ||
            'No se pudo actualizar la contraseña. El código podría haber expirado o ser incorrecto.',
        );
      }
    } catch (error) {
      Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}>
        <Text style={styles.backButtonText}>‹ Volver</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Crear Nueva Contraseña</Text>
      <Text style={styles.subtitle}>
        Ingresa tu nueva contraseña. Asegúrate de que sea segura.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Nueva contraseña"
        placeholderTextColor="#888"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmar nueva contraseña"
        placeholderTextColor="#888"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Actualizar Contraseña</Text>
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
  backButtonText: {fontSize: 16, color: '#007AFF', fontWeight: '500'},
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
  buttonDisabled: {backgroundColor: '#888'},
  buttonText: {color: '#f9f5f0', fontSize: 17, fontWeight: 'bold'},
});

export default ResetPasswordScreen;
