import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonItem({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <SkeletonItem width={120} height={14} style={{ marginBottom: 6 }} />
          <SkeletonItem width={180} height={24} />
        </View>
        <SkeletonItem width={40} height={40} borderRadius={20} />
      </View>

      {/* Hero / Stat Card Skeleton */}
      <View style={styles.card}>
        <SkeletonItem width={140} height={16} style={{ marginBottom: 12 }} />
        <SkeletonItem width={200} height={36} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <SkeletonItem width="46%" height={50} borderRadius={10} />
          <SkeletonItem width="46%" height={50} borderRadius={10} />
        </View>
      </View>

      {/* Grid Menu Skeleton */}
      <SkeletonItem width={140} height={18} style={{ marginVertical: 12 }} />
      <View style={styles.grid}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={styles.gridCard}>
            <SkeletonItem width={44} height={44} borderRadius={12} style={{ marginBottom: 8 }} />
            <SkeletonItem width="70%" height={14} />
          </View>
        ))}
      </View>

      {/* Recent List Skeleton */}
      <SkeletonItem width={160} height={18} style={{ marginTop: 16, marginBottom: 10 }} />
      {[1, 2, 3].map(i => (
        <View key={i} style={styles.listCard}>
          <SkeletonItem width={42} height={42} borderRadius={10} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <SkeletonItem width="65%" height={16} style={{ marginBottom: 6 }} />
            <SkeletonItem width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.container}>
      <View style={styles.searchBarSkeleton}>
        <SkeletonItem width="100%" height={44} borderRadius={12} />
      </View>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <SkeletonItem width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <SkeletonItem width="55%" height={16} style={{ marginBottom: 6 }} />
              <SkeletonItem width="35%" height={12} />
            </View>
            <SkeletonItem width={60} height={22} borderRadius={6} />
          </View>
          <SkeletonItem width="100%" height={1} style={{ marginVertical: 8 }} />
          <SkeletonItem width="85%" height={14} style={{ marginBottom: 4 }} />
          <SkeletonItem width="60%" height={14} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  skeleton: {
    backgroundColor: '#e1e5ea',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  searchBarSkeleton: {
    marginBottom: 16,
  },
});
