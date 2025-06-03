import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Barbershop {
  id: number;
  nombre: string;
  logo_url?: string;
}

interface Barber {
  usuario_id: number; // Usa este ID para navegación
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

interface BarbershopDetails {
  id: number;
  nombre: string;
  servicios: Service[];
  barberos: Barber[];
}

const API_BASE = 'http://192.168.1.202:3001/api';

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para selector de fecha y hora
  const [fecha, setFecha] = useState<Date>(new Date());
  const [mostrarPicker, setMostrarPicker] = useState(false);
  const [modoPicker, setModoPicker] = useState<'date' | 'time'>('date');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/barbershops/${barberiaId}`);
        const data = await res.json();
        setBarbershop(data);

        if (barberoId) {
          const foundBarber = data.barberos.find((b: Barber) => b.usuario_id === barberoId);
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
    setSelectedService(null); // limpia el servicio si cambia el barbero
  };

  const onSelectService = (service: Service) => {
    setSelectedService(service);
  };

  const mostrarSelector = (modo: 'date' | 'time') => {
    setModoPicker(modo);
    setMostrarPicker(true);
  };

  const onChangeFechaHora = (event: any, selectedDate?: Date) => {
    setMostrarPicker(false);
    if (selectedDate) {
      setFecha(selectedDate);
    }
  };

  const onConfirmAppointment = async () => {
    if (!selectedBarber || !selectedService || !barbershop) {
      Alert.alert('Atención', 'Por favor selecciona un barbero y un servicio.');
      return;
    }

    setIsSubmitting(true);

    const fechaISO = fecha.toISOString();
    const fechaStr = fechaISO.split('T')[0]; // yyyy-mm-dd
    const horaStr = fechaISO.split('T')[1].substring(0, 8); // hh:mm:ss

    const payload = {
      usuario_id: user.id,
      barberia_id: barbershop.id,
      barbero_id: selectedBarber.usuario_id,
      servicios_id: [selectedService.id],
      fecha: fechaStr,
      hora: horaStr,
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
            onPress: () => navigation.navigate('AppointmentsScreen', { userId: user.id }),
          },
          { text: 'Cerrar', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Error', data.message || 'No se pudo registrar la cita.');
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
      {/* Nombre y logo de la barbería */}
      <View style={styles.barbershopHeader}>
        {barbershop.logo_url ? (
          <Image source={{ uri: barbershop.logo_url }} style={styles.logo} />
        ) : (
          <MaterialIcons name="store" size={70} color="#ccc" />
        )}
        <Text style={styles.barbershopName}>{barbershop.nombre}</Text>
      </View>

      {/* Barberos */}
      <Text style={styles.sectionTitle}>Barberos</Text>
      {barbershop.barberos.length === 0 ? (
        <Text style={styles.emptyText}>No hay barberos disponibles.</Text>
      ) : (
        barbershop.barberos.map((barber) => (
          <TouchableOpacity
            key={barber.usuario_id}
            style={[
              styles.card,
              selectedBarber?.usuario_id === barber.usuario_id && styles.selectedCard,
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

      {/* Servicios */}
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

      {/* Selector fecha/hora */}
      {selectedBarber && selectedService && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 15 }}>
          <TouchableOpacity style={styles.selectorButton} onPress={() => mostrarSelector('date')}>
            <Text>Fecha: {fecha.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectorButton} onPress={() => mostrarSelector('time')}>
            <Text>Hora: {fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
        </View>
      )}

      {mostrarPicker && (
        <DateTimePicker
          value={fecha}
          mode={modoPicker}
          display="default"
          onChange={onChangeFechaHora}
          minimumDate={new Date()}
        />
      )}

      {/* Botón Confirmar */}
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
  selectorButton: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
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
