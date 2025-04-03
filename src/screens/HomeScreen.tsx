import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const HomeScreen = ({ route }) => {
  const userName = route.params?.name || 'Usuario';

  return (
    <View style={styles.container}>
      {/* Barra superior */}
      <View style={styles.topBar}>
        <Text style={styles.welcome}>Bienvenido</Text>
        <View style={styles.topRight}>
          <Text style={styles.language}>
            ES <Icon name="chevron-down" size={16} color="#fff" />
          </Text>
          <TouchableOpacity>
            <Icon name="account-circle-outline" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Logo al centro */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/barbersmart-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.userGreeting}>Hola, {userName} 👋</Text>
      </View>

      {/* Barra inferior */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.tab}>
          <Icon name="home-outline" size={24} color="#000" />
          <Text style={styles.tabLabel}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Icon name="map-marker-radius-outline" size={24} color="#000" />
          <Text style={styles.tabLabel}>Ubicaciones</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.centerButton}>
          <Icon name="plus" size={30} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Icon name="scissors-cutting" size={24} color="#000" />
          <Text style={styles.tabLabel}>Servicios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Icon name="information-outline" size={24} color="#000" />
          <Text style={styles.tabLabel}>Acerca de</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f5f0',
  },
  topBar: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  language: {
    color: '#fff',
    marginRight: 10,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
  userGreeting: {
    fontSize: 18,
    color: '#222',
    marginTop: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tab: {
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  centerButton: {
    backgroundColor: '#000',
    borderRadius: 25,
    padding: 10,
    marginTop: -20,
  },
});
