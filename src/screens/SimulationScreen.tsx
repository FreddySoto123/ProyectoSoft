import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';

const SimulationScreen = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const devices = useCameraDevices();
  const device = devices.front;

  useEffect(() => {
    const requestPermission = async () => {
      const status = await Camera.requestCameraPermission();
      if (status === 'authorized') {
        setHasPermission(true);
      } else {
        Alert.alert('Permiso denegado', 'No se puede acceder a la cámara.');
      }
    };

    requestPermission();
  }, []);

  return (
    <View style={styles.container}>
      {hasPermission && device ? (
        <>
          <Camera
            style={styles.camera}
            device={device}
            isActive={true}
          />
          <Text style={styles.info}>Detectando tipo de rostro...</Text>
        </>
      ) : (
        <Text style={styles.text}>Esperando permiso para usar la cámara...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f5f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: '70%',
  },
  text: {
    fontSize: 16,
    color: '#555',
  },
  info: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginTop: 20,
  },
});

export default SimulationScreen;
