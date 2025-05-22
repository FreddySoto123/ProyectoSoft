import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
const HomeScreen = ({route}) => {
  const {userId, name} = route.params;
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Barra superior */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Bienvenido</Text>
        <View style={styles.headerRight}>
          <Text style={styles.language}>ES ⌄</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile', {userId})}>
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logo y texto */}
      <ScrollView
        style={styles.scrollableContent} // Estilo para el ScrollView
        contentContainerStyle={styles.scrollableContentContainer} // Estilo para el contenido interno
        showsVerticalScrollIndicator={false} // Opcional: oculta la barra de scroll
      >
        <Image
          source={require('../../assets/barbersmart-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.welcomeText}>¿Cómo estás, {name}?</Text>

        {/* Opciones principales */}
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('SelectBarbershop')}>
            <Text style={styles.menuText}>Buscar Barberías</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Citas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Barberos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Services')}>
            <Text style={styles.menuText}>Servicios</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9f5f0', alignItems: 'center'},

  header: {
    width: '100%',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#000',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {color: '#fff', fontSize: 18, fontWeight: 'bold'},
  headerRight: {flexDirection: 'row', alignItems: 'center'},
  language: {color: '#fff', marginRight: 15},
  profileIcon: {fontSize: 18, color: '#fff'},
  scrollableContent: {
    // Estilo para el ScrollView en sí
    width: '100%',
  },
  scrollableContentContainer: {
    // Estilo para el contenido DENTRO del ScrollView
    alignItems: 'center', // Para centrar el logo, texto de bienvenida, y el menú
    paddingBottom: 20, // Espacio al final del scroll
  },
  logo: {width: 180, height: 180, marginTop: 20, marginBottom: 10},
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#222',
    marginBottom: 20,
    textAlign: 'center',
  },

  menu: {width: '100%'},
  menuItem: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 10,
    marginVertical: 8,
    alignItems: 'center',
  },
  menuText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},

  footer: {
    width: '100%',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ccc',
    flexDirection: 'row',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
  },
  footerItem: {fontSize: 14, color: '#222', fontWeight: '500'},
});

export default HomeScreen;
