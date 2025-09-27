// components/three/SceneCanvas.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

const SceneCanvas = ({ children }: { children: React.ReactNode }) => {
  return (
    <Canvas
      style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }}
      camera={{ position: [0, 0, 5], fov: 75 }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <OrbitControls />
      {children}
    </Canvas>
  );
};

export default SceneCanvas;
