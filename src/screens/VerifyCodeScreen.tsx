// screens/VerifyCodeScreen.tsx
import React, {useState, useRef, useEffect} from 'react';
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

type VerifyCodeScreenRouteProp = RouteProp<RootStackParamList, 'VerifyCode'>;

const CODE_LENGTH = 6;

const VerifyCodeScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<VerifyCodeScreenRouteProp>();
  const {email} = route.params;

  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<(TextInput | null)[]>([]);

  const handleInputChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Mover al siguiente input
    if (text && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
    // Mover al input anterior si se borra
    if (!text && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const enteredCode = code.join('');
    if (enteredCode.length !== CODE_LENGTH) {
      Alert.alert(
        'Código Incompleto',
        'Por favor, ingresa los 6 dígitos del código.',
      );
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        'http://localhost:3001/api/auth/verify-reset-code',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email, code: enteredCode}),
        },
      );
      const data = await response.json();

      if (response.ok && data.isValid) {
        Alert.alert(
          'Código Verificado',
          'Ahora puedes crear una nueva contraseña.',
        );
        navigation.replace('ResetPassword', {email, code: enteredCode});
      } else {
        Alert.alert(
          'Error de Verificación',
          data.error || 'El código ingresado es incorrecto o ha expirado.',
        );
        setCode(Array(CODE_LENGTH).fill('')); // Limpiar inputs
        inputsRef.current[0]?.focus(); // Enfocar el primer input
      }
    } catch (error) {
      Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Opcional: Reenviar código (necesitaría lógica similar a ForgotPasswordScreen)
  const handleResendCode = () => {
    // Aquí podrías llamar a una función (quizás la misma de ForgotPasswordScreen)
    // para volver a enviar un código. Podrías pasar el email de nuevo.
    // navigation.navigate('ForgotPassword', { email }); // O directamente
    Alert.alert(
      'Reenviar Código',
      'Funcionalidad de reenviar código no implementada aún. Vuelve a la pantalla anterior para solicitar uno nuevo.',
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}>
        <Text style={styles.backButtonText}>‹ Volver</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Verificar Código</Text>
      <Text style={styles.subtitle}>
        Ingresa el código de 6 dígitos enviado a{'\n'}
        {email}.
      </Text>

      <View style={styles.codeInputContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            style={styles.codeInput}
            value={digit}
            onChangeText={text => handleInputChange(text, index)}
            keyboardType="number-pad"
            maxLength={1}
            ref={ref => (inputsRef.current[index] = ref)}
            autoFocus={index === 0} // Autofocus en el primer input
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyCode}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Verificar Código</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.resendButton} onPress={handleResendCode}>
        <Text style={styles.resendButtonText}>
          ¿No recibiste el código? Reenviar
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
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  codeInput: {
    width: 45,
    height: 55,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    textAlign: 'center',
    fontSize: 20,
    color: '#333',
    fontWeight: '600',
  },
  button: {
    width: '100%',
    backgroundColor: '#222',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {backgroundColor: '#888'},
  buttonText: {color: '#f9f5f0', fontSize: 17, fontWeight: 'bold'},
  resendButton: {marginTop: 10},
  resendButtonText: {fontSize: 15, color: '#007AFF', textAlign: 'center'},
});

export default VerifyCodeScreen;
