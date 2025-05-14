import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const services = [
  { id: '1', name: 'Corte de Cabello', price: 'Bs 25' },
  { id: '2', name: 'Afeitado Clásico', price: 'Bs 20' },
  { id: '3', name: 'Corte + Barba', price: 'Bs 40' },
  { id: '4', name: 'Mascarilla Facial', price: 'Bs 15' },
];

const ServicesScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nuestros Servicios</Text>
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.serviceItem}>
            <Text style={styles.serviceName}>{item.name}</Text>
            <Text style={styles.servicePrice}>{item.price}</Text>
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.simulationButton}
            onPress={() => navigation.navigate('Simulation')}
          >
            <Text style={styles.simulationButtonText}>Simulación</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f5f0' },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#222',
  },
  serviceItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginVertical: 8,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  servicePrice: {
    fontSize: 14,
    color: '#666',
  },
  simulationButton: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  simulationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ServicesScreen;
