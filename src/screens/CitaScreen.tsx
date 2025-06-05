import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator, Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface BarbershopDetails {
  id: number;
  nombre: string;
  servicios: Service[];
  barberos: Barber[];
}

interface Barber {
  barbero_id: number;       // id real barbero
  usuario_id: number;       // id usuario (opcional para mostrar)
  nombre_barbero: string;
  especialidad?: string;
  avatar_barbero?: string;
}

interface Service {
  id: number;
  nombre: string;
  descripcion?: string;
  duracion_estimada_minutos?: number;
  precio: number;
}

const API_BASE = 'http://172.172.9.19:3001/api';

const CitaScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { user, barberiaId, barberoId } = route.params as {
    user: { id: number };
    barberiaId: number;
    barberoId?: number;
  };

  const [barbershop, setBarbershop] = useState<BarbershopDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/barbershops/${barberiaId}`);
        const data = await res.json();

        // Para que barberos estén bien con id real, hacemos fetch adicional o usas los que ya vienen (asegúrate backend incluye barbero_id)
        if (data.barberos) {
          // aseguramos que cada barbero tenga barbero_id (corrige backend si no es así)
          data.barberos = data.barberos.map((b: any) => ({
            ...b,
            barbero_id: b.barbero_id || b.id || b.usuario_id,
          }));
        }

        setBarbershop(data);

        if (barberoId) {
          const foundBarber = data.barberos.find((b: Barber) => b.usuario_id === barberoId || b.barbero_id === barberoId);
          setSelectedBarber(foundBarber || null);
        }
      } catch (error) {
        Alert.alert('Error', 'No se pudo cargar la información de la barbería.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [barberiaId, barberoId]);

  const onSelectBarber = (barber: Barber) => {
    setSelectedBarber(barber);
    setSelectedService(null);
  };

  const onSelectService = (service: Service) => {
    setSelectedService(service);
  };

  const onChangeDateTime = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const showDatepicker = () => {
    setPickerMode('date');
    setShowPicker(true);
  };

  const showTimepicker = () => {
    setPickerMode('time');
    setShowPicker(true);
  };

  const onConfirmAppointment = async () => {
    if (!selectedBarber || !selectedService || !barbershop) {
      Alert.alert('Atención', 'Por favor selecciona un barbero, servicio, fecha y hora.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      usuario_id: user.id,
      barberia_id: barbershop.id,
      barbero_id: selectedBarber.barbero_id,  // usa el id real del barbero aquí
      servicios_id: [selectedService.id],
      fecha: date.toISOString().split('T')[0],
      hora: date.toTimeString().split(' ')[0].substring(0, 8),
    };

    try {
      const res = await fetch(`${API_BASE}/citas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        Alert.alert('Cita registrada', 'Tu cita ha sido agendada exitosamente.', [
          {
            text: 'Ver mis citas',
            
            onPress: () => navigation.navigate('AppointmentsScreen', { userId: user.id }), // Aquí PASA EL userId correcto

          },
          { text: 'Cerrar', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Error', data.error || 'No se pudo registrar la cita.');
      }
    } catch (error) {
      Alert.alert('Error de red', 'No se pudo conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !barbershop) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#333" />
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.barbershopHeader}>
        {barbershop.logo_url ? (
          <Image source={{ uri: barbershop.logo_url }} style={styles.logo} />
        ) : (
          <MaterialIcons name="store" size={70} color="#ccc" />
        )}
        <Text style={styles.barbershopName}>{barbershop.nombre}</Text>
      </View>

      <Text style={styles.sectionTitle}>Barberos</Text>
      {barbershop.barberos.length === 0 ? (
        <Text style={styles.emptyText}>No hay barberos disponibles.</Text>
      ) : (
        barbershop.barberos.map((barber) => (
          <TouchableOpacity
            key={barber.barbero_id}
            style={[
              styles.card,
              selectedBarber?.barbero_id === barber.barbero_id && styles.selectedCard,
            ]}
            onPress={() => onSelectBarber(barber)}
          >
            {barber.avatar_barbero ? (
              <Image source={{ uri: barber.avatar_barbero }} style={styles.avatar} />
            ) : (
              <MaterialIcons name="person" size={50} color="#bbb" />
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.barberName}>{barber.nombre_barbero}</Text>
              {barber.especialidad && (
                <Text style={styles.barberSpecialty}>{barber.especialidad}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))
      )}

      {selectedBarber && (
        <>
          <Text style={styles.sectionTitle}>Servicios</Text>
          {barbershop.servicios.length === 0 ? (
            <Text style={styles.emptyText}>No hay servicios disponibles.</Text>
          ) : (
            barbershop.servicios.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.card,
                  selectedService?.id === service.id && styles.selectedCard,
                ]}
                onPress={() => onSelectService(service)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{service.nombre}</Text>
                  {service.descripcion && (
                    <Text style={styles.serviceDescription}>{service.descripcion}</Text>
                  )}
                </View>
                <Text style={styles.servicePrice}>Bs {Number(service.precio).toFixed(2)}</Text>
              </TouchableOpacity>
            ))
          )}
        </>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Fecha y Hora</Text>
      <View style={styles.dateTimeRow}>
        <TouchableOpacity style={styles.dateTimeButton} onPress={showDatepicker}>
          <MaterialIcons name="calendar-today" size={22} color="#555" />
          <Text style={styles.dateTimeText}>{date.toLocaleDateString()}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateTimeButton} onPress={showTimepicker}>
          <MaterialIcons name="access-time" size={22} color="#555" />
          <Text style={styles.dateTimeText}>{date.toLocaleTimeString()}</Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode={pickerMode}
          is24Hour={true}
          display="default"
          onChange={onChangeDateTime}
          minimumDate={new Date()}
        />
      )}

      {selectedBarber && selectedService && (
        <TouchableOpacity
          style={[styles.confirmButton, isSubmitting && { opacity: 0.7 }]}
          onPress={onConfirmAppointment}
          disabled={isSubmitting}
        >
          <Text style={styles.confirmButtonText}>{isSubmitting ? 'Agendando...' : 'Confirmar Cita'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barbershopHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  barbershopName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#444',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCard: {
    backgroundColor: '#d0ebff',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  barberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  barberSpecialty: {
    fontSize: 13,
    color: '#666',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  serviceDescription: {
    fontSize: 13,
    color: '#666',
  },
  servicePrice: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#27ae60',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  dateTimeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  confirmButton: {
    backgroundColor: '#2c3e50',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginHorizontal: 40,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default CitaScreen;
