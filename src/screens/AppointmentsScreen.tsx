import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';

const AppointmentsScreen = ({ route }) => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = route.params?.userId; // ⚠️ Este debe venir de Home

  useEffect(() => {
    const fetchCitas = async () => {
      try {
        const response = await fetch(`http://192.168.1.202:3001/api/citas/user/${userId}`);
        const data = await response.json();
        if (response.ok) setCitas(data);
        else Alert.alert('Error', 'No se pudieron cargar tus citas.');
      } catch (err) {
        Alert.alert('Error', 'Error de red al obtener las citas.');
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchCitas();
  }, [userId]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={citas}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.container}
      ListEmptyComponent={<Text style={styles.empty}>No tienes citas aún.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.nombre_barberia}</Text>
          <Text>{item.fecha} - {item.hora}</Text>
          <Text>Servicios: {item.servicios.join(', ')}</Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12 },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 }
});

export default AppointmentsScreen;
