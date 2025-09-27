import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MusicVisualizer = ({ level = 1 }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      // Smoothly interpolate scale on Y axis to the target level
      meshRef.current.scale.y += (level - meshRef.current.scale.y) * 0.1;

      // Pulse color from hotpink to lightblue based on level
      const color = new THREE.Color().lerpColors(
        new THREE.Color('hotpink'),
        new THREE.Color('lightblue'),
        Math.min(level - 1, 1)
      );
      meshRef.current.material.color = color;
    }
  });

  return (
    <mesh ref={meshRef} scale={[1, level, 1]} position={[2, 0, 0]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial />
    </mesh>
  );
};

export default MusicVisualizer;
