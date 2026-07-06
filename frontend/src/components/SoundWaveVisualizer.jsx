import React, { useState, useEffect } from 'react';

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
    <div style={styles.container}>
      {bars.map((height, idx) => (
        <div
          key={idx}
          style={{
            ...styles.bar,
            height: `${height}px`,
            // Stagger colors for a beautiful pink-indigo gradient visualizer
            background: `linear-gradient(to top, #6366F1, #8B5CF6, #EC4899)`,
          }}
        />
      ))}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    height: '100px',
    width: '100%',
    padding: '0 20px',
  },
  bar: {
    width: '6px',
    borderRadius: '3px',
    transition: 'height 0.12s ease-in-out',
    minHeight: '6px',
  },
};

export default SoundWaveVisualizer;
