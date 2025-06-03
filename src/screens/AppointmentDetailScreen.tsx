// screens/AppointmentDetailScreen.tsx (Ejemplo)
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useRoute, RouteProp, useNavigation} from '@react-navigation/native';

// Asume que recibes un objeto 'cita' completo o un 'citaId' para cargar los detalles
// Esta es la estructura que el backend devuelve en getUserAppointments
interface CitaConDetalles {
  id: number;
  fecha: string;
  hora: string;
  monto_total: string | number;
  estado_pago: string;
  metodo_pago?: string;
  nombre_barberia: string;
  nombre_barbero: string;
  servicios_nombres: string;
  qr_imagen_url?: string; // La URL del QR del barbero/barbería
}

type RootStackParamList = {
  AppointmentDetail: {cita: CitaConDetalles}; // Pasas el objeto cita completo
  // o AppointmentDetail: { citaId: number }; si cargas los detalles aquí
};
type AppointmentDetailRouteProp = RouteProp<
  RootStackParamList,
  'AppointmentDetail'
>;

const AppointmentDetailScreen: React.FC = () => {
  const route = useRoute<AppointmentDetailRouteProp>();
  const navigation = useNavigation();
  // Si pasas el objeto cita completo desde la lista:
  const {cita} = route.params;

  // Si solo pasas citaId y necesitas cargar detalles aquí:
  // const { citaId } = route.params;
  // const [cita, setCita] = useState<CitaConDetalles | null>(null);
  // const [loading, setLoading] = useState(true);
  // useEffect(() => { /* Lógica para fetch /api/appointments/:citaId */ }, [citaId]);

  const [showQrModal, setShowQrModal] = useState(false);

  const handleVerQR = () => {
    if (cita?.estado_pago === 'Pagado') {
      Alert.alert('Información', 'Esta cita ya ha sido pagada.');
      return;
    }
    if (!cita?.qr_imagen_url) {
      Alert.alert(
        'QR no Disponible',
        'El QR para el pago no está disponible para este barbero/barbería.',
      );
      return;
    }
    setShowQrModal(true);
  };

  if (!cita) {
    // O if (loading) si cargas detalles aquí
    return (
      <ActivityIndicator
        size="large"
        style={{flex: 1, justifyContent: 'center'}}
      />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Detalle de la Cita #{cita.id}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen</Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Barbería:</Text> {cita.nombre_barberia}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Barbero:</Text> {cita.nombre_barbero}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Servicios:</Text> {cita.servicios_nombres}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Fecha:</Text>{' '}
          {new Date(cita.fecha).toLocaleDateString()}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Hora:</Text> {cita.hora.substring(0, 5)}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Monto Total:</Text> Bs{' '}
          {Number(cita.monto_total).toFixed(2)}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Estado del Pago:</Text> {cita.estado_pago}
        </Text>
        {cita.metodo_pago && (
          <Text style={styles.detailText}>
            <Text style={styles.label}>Método de Pago:</Text> {cita.metodo_pago}
          </Text>
        )}
      </View>

      {cita.estado_pago === 'Pendiente' && (
        <TouchableOpacity style={styles.qrButton} onPress={handleVerQR}>
          <Text style={styles.qrButtonText}>Pagar con QR</Text>
        </TouchableOpacity>
      )}

      {/* Modal para mostrar el QR */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showQrModal}
        onRequestClose={() => setShowQrModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pagar a {cita.nombre_barbero}</Text>
            <Text style={styles.modalAmount}>
              Monto: Bs {Number(cita.monto_total).toFixed(2)}
            </Text>
            {cita.qr_imagen_url ? (
              <Image
                source={{uri: cita.qr_imagen_url}} // Asumiendo que es una URL completa
                style={styles.qrImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.modalText}>QR no disponible.</Text>
            )}
            <Text style={styles.modalInstructions}>
              Escanea este código QR con tu aplicación de banca móvil para
              completar el pago. Una vez realizado, el barbero confirmará la
              recepción.
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowQrModal(false)}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f4f0e8', padding: 15},
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
  },
  cardTitle: {fontSize: 20, fontWeight: '600', marginBottom: 15, color: '#444'},
  detailText: {fontSize: 16, marginBottom: 8, color: '#555', lineHeight: 22},
  label: {fontWeight: 'bold', color: '#333'},
  qrButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrButtonText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    width: '90%',
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalAmount: {fontSize: 18, marginBottom: 20, color: '#555'},
  qrImage: {
    width: 250,
    height: 250,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  modalText: {fontSize: 16, color: '#555', marginBottom: 20},
  modalInstructions: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginBottom: 25,
  },
  closeButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  closeButtonText: {color: '#fff', fontSize: 16, fontWeight: '500'},
});

export default AppointmentDetailScreen;
