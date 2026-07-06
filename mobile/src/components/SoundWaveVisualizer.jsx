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
      const baseHeight = Math.max(8, amplitude * 80); 
      const newBars = bars.map(() => {
        const randomness = Math.random() * 0.4 + 0.8; 
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
          colors={['#EC4899', '#8B5CF6', '#6366F1']}
          style={[styles.bar, { height }]}
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
    gap: 6,
  },
  bar: {
    width: 6,
    borderRadius: 3,
    minHeight: 6,
  },
});

export default SoundWaveVisualizer;
