import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, Image, ImageBackground, Dimensions, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    if (onFinish) {
      const timer = setTimeout(() => {
        onFinish();
      }, 2400);

      return () => clearTimeout(timer);
    }
  }, [fadeAnim, scaleAnim, onFinish]);

  return (
    <ImageBackground
      source={require('../../assets/splash-icon.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* App Logo Icon (Monochrome Logo in Center) */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/android-icon-monochrome.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.appTitle}>KEBAZENI</Text>
        <Text style={styles.appSubtitle}>Sistem Informasi Digital RW 09</Text>

        <View style={styles.divider} />

        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>Versi 1.2.3</Text>
        </View>

        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color="#00216e" />
          <Text style={styles.loadingText}>Memuat aplikasi...</Text>
        </View>
      </Animated.View>

      <Text style={styles.copyrightText}>© 2026 Kebazeni Digital RW 09</Text>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#c8beee',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1a103c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  logoImage: {
    width: 96,
    height: 96,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00216e',
    letterSpacing: 1.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#334155',
    marginTop: 6,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: '#00216e',
    borderRadius: 2,
    marginVertical: 18,
  },
  badgeWrap: {
    backgroundColor: 'rgba(0, 33, 110, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(0, 33, 110, 0.15)',
  },
  badgeText: {
    color: '#00216e',
    fontSize: 11,
    fontWeight: '600',
  },
  loaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
  },
  copyrightText: {
    position: 'absolute',
    bottom: 30,
    color: '#64748b',
    fontSize: 11,
    zIndex: 1,
  },
});
