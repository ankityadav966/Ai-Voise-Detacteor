import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SoundWaveVisualizer = ({ amplitude = 0.0, isRecording = false }) => {
  const [bars, setBars] = useState(new Array(13).fill(4));

  useEffect(() => {
    if (!isRecording) {
      setBars(new Array(13).fill(4));
      return;
    }

    const interval = setInterval(() => {
      // Create organic bouncing heights based on amplitude
      const baseHeight = Math.max(8, amplitude * 80); // Max height 80px
      const newBars = bars.map(() => {
        const randomness = Math.random() * 0.4 + 0.8; // 80% to 120% of baseHeight
        return Math.min(80, Math.max(4, baseHeight * randomness));
      });
      setBars(newBars);
    }, 100);

    return () => clearInterval(interval);
  }, [amplitude, isRecording]);

  return (
    <View style={styles.container}>
      {bars.map((height, idx) => (
        <LinearGradient
          key={idx}
          colors={['#6366F1', '#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[
            styles.bar,
            {
              height: height,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    width: '100%',
    paddingHorizontal: 20,
  },
  bar: {
    width: 6,
    marginHorizontal: 3,
    borderRadius: 3,
    minHeight: 6,
  },
});

export default SoundWaveVisualizer;
