// screens/PaymentDataEntryScreen.tsx
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StatusBar,
  Modal,
  SafeAreaView,
} from 'react-native';
import {WebView, WebViewNavigation} from 'react-native-webview';
import {useRoute, RouteProp, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// ... (Definiciones de AppointmentFromBackend, RootStackParamList y API_BASE_URL como antes) ...
interface AppointmentFromBackend {
  id: number;
  usuario_id: number | string; // ID del usuario cliente
  fecha: string;
  hora: string;
  monto_total: string | number;
  estado_de_cita: string;
  estado_pago: string;
  nombre_barberia: string;
  nombre_barbero: string;
  servicios_nombres: string;
  email_cliente?: string;
  nombre_cliente?: string;
  ci_cliente?: string;
  nit_cliente?: string;
  libelula_transaction_id?: string;
  libelula_payment_url?: string;
  libelula_qr_url?: string;
}

type RootStackParamList = {
  AppointmentsScreen: {userId: number | string; refresh?: boolean};
  AppointmentDetail: {cita: AppointmentFromBackend; userId?: string | number};
  PaymentDataEntry: {cita: AppointmentFromBackend};
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001/api';

type PaymentDataEntryRouteProp = RouteProp<
  RootStackParamList,
  'PaymentDataEntry'
>;
type PaymentDataEntryNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PaymentDataEntry'
>;

const DEEP_LINK_SCHEME = 'barbersmartapp://';
const PAYMENT_SUCCESS_PATH = 'payment/status?status=success';
const PAYMENT_FAILURE_PATH = 'payment/status?status=failure';
const PAYMENT_PENDING_PATH = 'payment/status?status=pending';

const PaymentDataEntryScreen: React.FC = () => {
  const route = useRoute<PaymentDataEntryRouteProp>();
  const navigation = useNavigation<PaymentDataEntryNavigationProp>();
  const {cita} = route.params;

  const [ci, setCi] = useState(cita.ci_cliente || '');
  const [nit, setNit] = useState(cita.nit_cliente || '');

  const [isProcessing, setIsProcessing] = useState(false); // Para la generación del enlace
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
  const [libelulaTransactionId, setLibelulaTransactionId] = useState<
    string | null
  >(null);
  const [showWebView, setShowWebView] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    navigation.setOptions({title: `Pago Cita #${cita.id}`});
    // Si la cita ya tiene URLs de pago (ej. si el usuario vuelve a esta pantalla)
    if (cita.libelula_payment_url) setPaymentUrl(cita.libelula_payment_url);
    if (cita.libelula_qr_url) setPaymentQrUrl(cita.libelula_qr_url);
    if (cita.libelula_transaction_id)
      setLibelulaTransactionId(cita.libelula_transaction_id);
  }, [navigation, cita]);

  const handleGenerateLibelulaLink = async () => {
    if (!ci && !nit) {
      Alert.alert('Datos incompletos', 'Por favor, ingresa tu CI o NIT.');
      return;
    }

    setIsProcessing(true);
    // No reseteamos paymentUrl aquí para que el botón de "Abrir pasarela" siga visible si ya se generó
    // setPaymentUrl(null); setPaymentQrUrl(null); setLibelulaTransactionId(null);
    console.log(
      `FRONTEND (PaymentDataEntry): Solicitando URL de pago para cita ID: ${cita.id}`,
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/appointments/${cita.id}/request-payment-url`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            ci_cliente_form: ci.trim(),
            nit_cliente_form: nit.trim(),
          }),
        },
      );

      if (!response.ok) {
        let errorText = `Error HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorText =
            errorData.error ||
            errorData.details ||
            errorData.message ||
            errorText;
        } catch (jsonParseError) {
          const textError = await response.text();
          console.error('Respuesta no JSON (PaymentDataEntry):', textError);
        }
        throw new Error(errorText);
      }

      const data = await response.json();
      console.log(
        'FRONTEND (PaymentDataEntry): Respuesta de request-payment-url:',
        data,
      );

      if (data.paymentUrl) {
        setPaymentUrl(data.paymentUrl); // Establecer la URL para el botón y el WebView
        if (data.qrUrl) setPaymentQrUrl(data.qrUrl);
        if (data.transactionId) setLibelulaTransactionId(data.transactionId);
        // NO abrimos el WebView automáticamente, el usuario lo hará con el botón
        Alert.alert(
          'Enlace Generado',
          "El enlace de pago y/o QR están listos. Presiona 'Abrir Pasarela de Pago' para continuar.",
        );
      } else {
        Alert.alert(
          'Error de Pago',
          data.error || data.details || 'No se pudo generar el enlace de pago.',
        );
      }
    } catch (error: any) {
      console.error(
        'FRONTEND (PaymentDataEntry): Error en handleGenerateLibelulaLink:',
        error.message,
        error,
      );
      Alert.alert('Error', error.message || 'No se pudo conectar.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenWebView = () => {
    if (paymentUrl) {
      setShowWebView(true); // Ahora el botón activa el WebView
    } else {
      Alert.alert('Enlace no disponible', 'Primero genera el enlace de pago.');
    }
  };

  const handleWebViewNavigationStateChange = (navState: WebViewNavigation) => {
    const {url} = navState;
    console.log('WebView URL:', url);

    if (url.startsWith(DEEP_LINK_SCHEME)) {
      setShowWebView(false);
      // ... (lógica de manejo de deep link y navegación igual que antes)
      if (
        url.includes(PAYMENT_SUCCESS_PATH) ||
        url.includes('status=paid') ||
        url.includes('status=aprobada')
      ) {
        Alert.alert(
          'Pago Exitoso',
          'Tu pago ha sido procesado con éxito. El estado se actualizará en breve.',
        );
      } else if (
        url.includes(PAYMENT_FAILURE_PATH) ||
        url.includes('status=failed') ||
        url.includes('status=rechazada')
      ) {
        Alert.alert(
          'Pago Fallido',
          'Hubo un problema al procesar tu pago. Por favor, inténtalo de nuevo.',
        );
      } else if (
        url.includes(PAYMENT_PENDING_PATH) ||
        url.includes('status=pending')
      ) {
        Alert.alert(
          'Pago Pendiente',
          'Tu pago está pendiente de confirmación.',
        );
      } else {
        Alert.alert('Pago', 'Proceso de pago finalizado.');
      }
      if (!cita.usuario_id) {
        console.error('PaymentDataEntry: Falta usuario_id en el objeto cita.');
        navigation.goBack();
        return;
      }
      navigation.navigate('AppointmentsScreen', {
        userId: cita.usuario_id,
        refresh: true,
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.screenContainer}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled">
        <StatusBar
          barStyle="dark-content"
          backgroundColor={styles.screenContainer.backgroundColor}
        />

        {!showWebView && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Datos para el Pago</Text>
              <Text style={styles.infoText}>
                Cita: #{cita.id} - {cita.nombre_barberia}
              </Text>
              <Text style={styles.infoText}>
                Monto a Pagar: Bs {Number(cita.monto_total).toFixed(2)}
              </Text>
              <Text style={styles.infoTextSmall}>
                (La razón social para la factura será "
                {cita.servicios_nombres || 'Servicios de Barbería'}".)
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>CI del Cliente:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 1234567"
                  value={ci}
                  onChangeText={setCi}
                  keyboardType="numeric"
                  editable={!isProcessing && !paymentUrl}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  NIT del Cliente (Opcional si tienes CI):
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 1234567890"
                  value={nit}
                  onChangeText={setNit}
                  keyboardType="numeric"
                  editable={!isProcessing && !paymentUrl}
                />
              </View>

              {/* Botón para generar el enlace o QR si aún no se ha hecho */}
              {!paymentUrl && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.generatePaymentButton]}
                  onPress={handleGenerateLibelulaLink}
                  disabled={isProcessing}>
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonText}>
                      Generar Enlace/QR de Pago
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Sección para mostrar el enlace y QR generados */}
            {paymentUrl && ( // Mostrar esta sección si paymentUrl existe
              <View style={[styles.card, styles.paymentResultSection]}>
                <Text style={styles.cardTitle}>¡Listo para Pagar!</Text>
                {libelulaTransactionId && (
                  <Text style={styles.infoTextSmall}>
                    ID Transacción: {libelulaTransactionId}
                  </Text>
                )}

                <TouchableOpacity // BOTÓN PARA ABRIR EL WEBVIEW
                  style={[styles.actionButton, styles.payOnlineButton]}
                  onPress={handleOpenWebView} // Llama a la función para mostrar el WebView
                  disabled={isProcessing} // Podrías deshabilitarlo si isProcessing es true
                >
                  <MaterialIcons
                    name="open-in-new"
                    size={20}
                    color="#fff"
                    style={{marginRight: 8}}
                  />
                  <Text style={styles.actionButtonText}>
                    Abrir Pasarela de Pago
                  </Text>
                </TouchableOpacity>

                {paymentQrUrl && (
                  <View style={styles.qrContainer}>
                    <Text style={styles.qrLabel}>
                      O escanea el código QR para pagar:
                    </Text>
                    <Image
                      source={{uri: paymentQrUrl}}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.qrNote}>
                      (Asegúrate de tener una app compatible)
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.checkPaymentStatusButton,
                    {marginTop: 15},
                  ]}
                  onPress={() => {
                    if (!cita.usuario_id) {
                      console.error('PaymentDataEntry: Falta usuario_id.');
                      navigation.goBack();
                      return;
                    }
                    navigation.navigate('AppointmentsScreen', {
                      userId: cita.usuario_id,
                      refresh: true,
                    });
                  }}>
                  <MaterialIcons
                    name="refresh"
                    size={20}
                    color="#fff"
                    style={{marginRight: 8}}
                  />
                  <Text style={styles.actionButtonText}>
                    Hecho / Verificar Estado
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Modal o Vista para el WebView */}
        {showWebView && paymentUrl && (
          <Modal
            visible={showWebView}
            onRequestClose={() => {
              setShowWebView(false);
              Alert.alert('Pago Cancelado', 'Has cerrado la pasarela de pago.');
            }}
            animationType="slide">
            <SafeAreaView style={styles.webViewSafeArea}>
              <View style={styles.webViewHeader}>
                <TouchableOpacity
                  onPress={() => setShowWebView(false)}
                  style={styles.webViewCloseButton}>
                  <MaterialIcons name="close" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.webViewTitle}>Pasarela de Pago Segura</Text>
                <View style={{width: 28}} />
              </View>
              <WebView
                ref={webViewRef}
                source={{uri: paymentUrl}}
                style={styles.webView}
                onNavigationStateChange={handleWebViewNavigationStateChange}
                startInLoadingState={true}
                renderLoading={() => (
                  <ActivityIndicator
                    style={styles.webViewLoading}
                    size="large"
                    color="#007bff"
                  />
                )}
                onError={syntheticEvent => {
                  const {nativeEvent} = syntheticEvent;
                  console.warn('WebView error: ', nativeEvent);
                  setShowWebView(false);
                  Alert.alert(
                    'Error en Pasarela',
                    'No se pudo cargar la pasarela. Verifica tu conexión.',
                  );
                }}
                // Importante para iOS para permitir la navegación fuera del dominio inicial si es necesario
                // y para manejar redirecciones correctamente.
                originWhitelist={['*']}
                // Para Android, esto puede ayudar con ciertas redirecciones o si la pasarela usa pop-ups.
                // domStorageEnabled={true}
                // javaScriptEnabled={true}
                // thirdPartyCookiesEnabled={true} // Si la pasarela depende de cookies de terceros
              />
            </SafeAreaView>
          </Modal>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ... (Estilos iguales que antes, asegúrate de tenerlos todos)
const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#f4f6f8'},
  screenContainer: {flex: 1, backgroundColor: '#f4f6f8'},
  scrollContentContainer: {padding: 15, paddingBottom: 40},
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#2c3e50',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingBottom: 12,
  },
  infoText: {fontSize: 16, color: '#34495e', marginBottom: 8},
  infoTextSmall: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  formGroup: {marginBottom: 20},
  label: {fontSize: 16, fontWeight: '500', color: '#495057', marginBottom: 8},
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  actionButton: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  generatePaymentButton: {backgroundColor: '#007bff', marginTop: 10},
  paymentResultSection: {
    borderColor: '#28a745',
    borderWidth: 0 /* Quitado borde verde */,
  },
  payOnlineButton: {backgroundColor: '#28a745', marginBottom: 15},
  checkPaymentStatusButton: {backgroundColor: '#6c757d'},
  qrSection: {
    borderColor: '#17a2b8',
    borderWidth: 0,
    marginTop: 0 /* Ajustes para QR */,
  },
  qrContainer: {alignItems: 'center', marginTop: 15, paddingVertical: 10},
  qrLabel: {fontSize: 15, color: '#333', marginBottom: 10, textAlign: 'center'},
  qrImage: {
    width: 220,
    height: 220,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f0f0f0',
  },
  qrNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  webViewSafeArea: {flex: 1, backgroundColor: '#fff'},
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 12, // Ajuste para iOS
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f8f8',
  },
  webViewCloseButton: {padding: 5},
  webViewTitle: {fontSize: 17, fontWeight: '600', color: '#333'},
  webView: {flex: 1},
  webViewLoading: {position: 'absolute', left: 0, right: 0, top: '45%'}, // Centrado
});

export default PaymentDataEntryScreen;
