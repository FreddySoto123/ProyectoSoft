import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, Platform } from "react-native";
// Import launchImageLibrary from react-native-image-picker
import { launchImageLibrary } from "react-native-image-picker";

const ProfileScreen = ({ route }) => {
  const { userId } = route.params;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState(""); // This will hold the URL or local URI
  const [newAvatarUri, setNewAvatarUri] = useState(null); // To track if a new image was picked

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/auth/profile/${userId}`);
        const data = await response.json();

        if (response.ok) {
          setName(data.user.name);
          setEmail(data.user.email);
          setAvatar(data.user.avatar); // Set initial avatar URL from server
        } else {
          Alert.alert("Error", data.error || "No se pudo cargar el perfil.");
        }
      } catch (error) {
        Alert.alert("Error de red", "No se pudo conectar con el servidor.");
      }
    };

    fetchProfile();
  }, [userId]);

  const openGallery = () => {
    const options = {
      mediaType: "photo",
      quality: 0.8, // Reduce quality slightly for faster uploads
      includeBase64: false, // Not needed if uploading via FormData
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log("User cancelled image picker");
      } else if (response.errorCode) {
        console.log("ImagePicker Error: ", response.errorMessage);
        Alert.alert("Error", `Error al seleccionar imagen: ${response.errorMessage}`);
      } else if (response.assets && response.assets.length > 0) {
        const selectedAsset = response.assets[0];
        setAvatar(selectedAsset.uri); // Update displayed avatar immediately with local URI
        setNewAvatarUri(selectedAsset.uri); // Store new URI for upload
      }
    });
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert("Error", "Nombre y Correo Electrónico no pueden estar vacíos.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);

    // If a new avatar was selected, add it to FormData
    if (newAvatarUri) {
      const uriParts = newAvatarUri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append("avatar", {
        uri: Platform.OS === 'android' ? newAvatarUri : newAvatarUri.replace('file://', ''),
        name: `photo.${fileType}`,
        type: `image/${fileType}`,
      });
    }
    // Note: If you don't send an avatar, your backend should ideally
    // keep the existing one and not clear it.

    try {
      // Ensure your backend can handle 'multipart/form-data'
      // and a field named 'avatar' for the image file.
      const response = await fetch(`http://localhost:3001/api/auth/profile/${userId}`, {
        method: "PUT", // Or PATCH, depending on your API design
        headers: {
          // 'Content-Type': 'multipart/form-data' is set automatically by fetch when body is FormData
          // Add Authorization header if your API requires it
          // 'Authorization': `Bearer YOUR_AUTH_TOKEN_HERE`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Éxito", "Perfil actualizado correctamente.");
        // Update state with new data from server, especially the new avatar URL
        if (data.user) {
          setName(data.user.name);
          setEmail(data.user.email);
          setAvatar(data.user.avatar); // This should be the new cloud URL of the avatar
          setNewAvatarUri(null); // Reset new avatar tracker
        }
      } else {
        Alert.alert("Error al guardar", data.error || "No se pudo actualizar el perfil.");
      }
    } catch (error) {
      console.error("Save profile error:", error);
      Alert.alert("Error de red", "No se pudo conectar con el servidor para guardar los cambios.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Editar Perfil</Text>

      {/* Make the image container pressable to open gallery */}
      <TouchableOpacity onPress={openGallery} style={styles.imageContainer}>
        <Image
          source={
            avatar // This will be server URL or local file URI
              ? { uri: avatar }
              : require("../../assets/peero.png") // Your fallback image
          }
          style={styles.avatar}
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

      {/* Attach handleSave to the save button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Guardar Cambios</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f5f0", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 25, color: "#222", textAlign: 'center' },
  imageContainer: { alignItems: "center", marginBottom: 30 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 10, borderWidth: 2, borderColor: '#ddd' },
  changeText: { color: "#007bff", fontSize: 16, fontWeight: '500' },
  input: {
    width: "100%",
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
  },
  saveButton: { backgroundColor: "#000", padding: 15, borderRadius: 10, marginTop: 10 },
  saveText: { color: "#fff", fontWeight: "bold", textAlign: "center", fontSize: 16 },
});

export default ProfileScreen;