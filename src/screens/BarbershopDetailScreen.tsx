// screens/BarbershopDetailScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Tipado para los parámetros de ruta que esperas
type BarbershopDetailRouteParams = {
  barbershopId: number | string;
  barbershopName: string;
};

type BarbershopDetailScreenProps = {
  route: { params: BarbershopDetailRouteParams };
};

const BarbershopDetailScreen: React.FC<BarbershopDetailScreenProps> = ({ route }) => {
  const { barbershopId, barbershopName } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detalles de: {barbershopName}</Text>
      <Text>ID de la Barbería: {barbershopId}</Text>
      {/* Aquí mostrarás más detalles de la barbería */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default BarbershopDetailScreen;