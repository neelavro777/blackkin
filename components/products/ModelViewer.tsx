"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Center } from "@react-three/drei";
import { Loader2 } from "lucide-react";

function Model({ url, onLoaded }: { url: string; onLoaded: () => void }) {
  const { scene } = useGLTF(url);

  // onLoaded fires after Suspense resolves (model is ready to render)
  useEffect(() => {
    onLoaded();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

interface ModelViewerProps {
  url: string;
}

export default function ModelViewer({ url }: ModelViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const handleLoaded = useCallback(() => setLoaded(true), []);

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <Canvas camera={{ position: [0, 0.5, 3], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        <Suspense fallback={null}>
          <Model url={url} onLoaded={handleLoaded} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls
          autoRotate
          autoRotateSpeed={0.8}
          enableZoom
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
