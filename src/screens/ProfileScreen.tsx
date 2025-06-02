// ProfileScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Platform,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';

// Define el tipo para los parámetros de la ruta, si usas TypeScript para la navegación
type ProfileScreenRouteParams = {
  userId: string | number; // o el tipo que sea tu userId
};

// Define el tipo para las props del componente, incluyendo 'route'
type ProfileScreenProps = {
  route: {params: ProfileScreenRouteParams};
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({route}) => {
  const {userId} = route.params;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null); // Para la URL de visualización (puede ser local o de servidor)
  const [serverAvatarUrl, setServerAvatarUrl] = useState<string | null>(null); // URL del avatar tal como vino del servidor
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null); // URI local de la nueva imagen seleccionada

  const IMGBB_API_KEY = '81fd551e66f3e290dce7e02e4f730eac'; //  <--- ¡¡¡REEMPLAZA ESTO CON TU API KEY REAL DE IMGBB!!!

  useEffect(() => {
    const fetchProfile = async () => {
      console.log(`PROFILE SCREEN - Fetching profile for userId: ${userId}`);
      try {
        const response = await fetch(
          `http://localhost:3001/api/auth/profile/${userId}`,
        );
        const data = await response.json();
        console.log('PROFILE SCREEN - Datos recibidos de fetchProfile:', data);

        if (response.ok && data.user) {
          setName(data.user.name || '');
          setEmail(data.user.email || '');
          const fetchedAvatar = data.user.avatar || null; // Si es null o undefined, queda null
          setAvatar(fetchedAvatar);
          setServerAvatarUrl(fetchedAvatar);
        } else {
          Alert.alert('Error', data.error || 'No se pudo cargar el perfil.');
        }
      } catch (error) {
        console.error('PROFILE SCREEN - Error en fetchProfile:', error);
        Alert.alert('Error de red', 'No se pudo conectar con el servidor.');
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const openGallery = () => {
    const options = {
      mediaType: 'photo' as const, // Añadir 'as const' para tipado estricto
      quality: 0.8,
      includeBase64: false,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('PROFILE SCREEN - User cancelled image picker');
      } else if (response.errorCode) {
        console.log(
          'PROFILE SCREEN - ImagePicker Error: ',
          response.errorMessage,
        );
        Alert.alert(
          'Error',
          `Error al seleccionar imagen: ${response.errorMessage}`,
        );
      } else if (response.assets && response.assets.length > 0) {
        const selectedAsset = response.assets[0];
        if (selectedAsset.uri) {
          console.log(
            'PROFILE SCREEN - Nueva imagen seleccionada (local URI):',
            selectedAsset.uri,
          );
          setAvatar(selectedAsset.uri); // Actualiza la vista previa con la URI local
          setNewAvatarUri(selectedAsset.uri); // Guarda la URI para la subida
        }
      }
    });
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert(
        'Error',
        'Nombre y Correo Electrónico no pueden estar vacíos.',
      );
      return;
    }

    let finalAvatarUrlToSend = serverAvatarUrl; // Por defecto, la URL del avatar actual del servidor

    if (newAvatarUri) {
      console.log(
        'PROFILE SCREEN - Intentando subir nuevo avatar a ImgBB:',
        newAvatarUri,
      );
      const imgbbFormData = new FormData();
      imgbbFormData.append('key', IMGBB_API_KEY);
      const uriParts = newAvatarUri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      imgbbFormData.append('image', {
        uri:
          Platform.OS === 'android'
            ? newAvatarUri
            : newAvatarUri.replace('file://', ''),
        name: `avatar_${userId}_${Date.now()}.${fileType}`, // Nombre de archivo más único
        type: `image/${fileType}`,
      });

      try {
        const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: imgbbFormData,
        });
        const imgbbData = await imgbbResponse.json();

        if (imgbbResponse.ok && imgbbData.data && imgbbData.data.url) {
          finalAvatarUrlToSend = imgbbData.data.url;
          console.log(
            'PROFILE SCREEN - Avatar subido a ImgBB exitosamente. URL:',
            finalAvatarUrlToSend,
          );
        } else {
          console.error(
            'PROFILE SCREEN - Error al subir avatar a ImgBB:',
            imgbbData,
          );
          Alert.alert(
            'Error de Avatar',
            `No se pudo subir la imagen: ${
              imgbbData.error?.message || 'Error desconocido de ImgBB'
            }`,
          );
          return;
        }
      } catch (uploadError) {
        console.error(
          'PROFILE SCREEN - Error de red al subir avatar a ImgBB:',
          uploadError,
        );
        Alert.alert(
          'Error de Red (ImgBB)',
          'No se pudo conectar con el servidor de imágenes.',
        );
        return;
      }
    }

    const profileDataForBackend = {
      name,
      email,
      avatar: finalAvatarUrlToSend, // Puede ser la nueva URL de ImgBB, la URL del servidor anterior, o null
    };

    console.log(
      'PROFILE SCREEN - Enviando datos al backend para actualizar perfil:',
      profileDataForBackend,
    );

    try {
      const response = await fetch(
        `http://localhost:3001/api/auth/profile/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profileDataForBackend),
        },
      );

      const data = await response.json();
      console.log(
        'PROFILE SCREEN - Respuesta del backend (actualización de perfil):',
        data,
      );

      if (response.ok && data.user) {
        Alert.alert('Éxito', 'Perfil actualizado correctamente.');
        setName(data.user.name || '');
        setEmail(data.user.email || '');
        const updatedAvatar = data.user.avatar || null;
        setAvatar(updatedAvatar); // Actualiza la visualización
        setServerAvatarUrl(updatedAvatar); // Actualiza la URL "original" del servidor
        setNewAvatarUri(null); // Resetea el tracker
      } else {
        Alert.alert(
          'Error al guardar',
          data.error || 'No se pudo actualizar el perfil.',
        );
      }
    } catch (error) {
      console.error(
        'PROFILE SCREEN - Error de red al guardar perfil en backend:',
        error,
      );
      Alert.alert(
        'Error de red',
        'No se pudo conectar con el servidor para guardar los cambios.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Editar Perfil</Text>

      <TouchableOpacity onPress={openGallery} style={styles.imageContainer}>
        <Image
          source={
            avatar && avatar.trim() !== '' // Si avatar tiene una URL válida
              ? {uri: avatar}
              : require('../../assets/defaultprofile.jpg') // Tu imagen de fallback
          }
          style={styles.avatar}
          onError={e =>
            console.log(
              'PROFILE SCREEN - Error al cargar imagen del avatar:',
              e.nativeEvent.error,
            )
          }
        />
        <Text style={styles.changeText}>Cambiar Foto</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Nombre"
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Correo Electrónico"
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#888"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Guardar Cambios</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9f5f0', padding: 20, paddingTop: 40}, // Añadido paddingTop
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#222',
    textAlign: 'center',
  },
  imageContainer: {alignItems: 'center', marginBottom: 30},
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#e0e0e0', // Un color de fondo mientras carga o si falla
  },
  changeText: {color: '#007bff', fontSize: 16, fontWeight: '500'},
  input: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default ProfileScreen;
