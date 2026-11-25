import { useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { getGoldLeafBumpTexture } from '../../utils/proceduralTextures';

interface LuxuryGiftBox3DProps {
  size?: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  lidRef?: React.RefObject<THREE.Group | null>;
}

function createExtrudedRibbonGeometry(length: number, width: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hl = length / 2;
  shape.moveTo(-hw, -hl);
  shape.lineTo(hw, -hl);
  shape.lineTo(hw, hl);
  shape.lineTo(-hw, hl);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  geom.center();
  return geom;
}

function createBowLoopCurve(direction: number, scale: number): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.14 * direction * scale, 0.16 * scale, 0.07 * scale),
      new THREE.Vector3(0.32 * direction * scale, 0.19 * scale, 0),
      new THREE.Vector3(0.24 * direction * scale, 0.04 * scale, -0.06 * scale),
      new THREE.Vector3(0, 0.01 * scale, 0),
    ],
    false
  );
  return new THREE.TubeGeometry(curve, 24, 0.036 * scale, 10, false);
}

/**
 * High-detail procedural velvet-black beveled gift box with separate overlapping lid,
 * ExtrudeGeometry satin gold ribbons, and sculpted 3D ribbon bow.
 */
export function LuxuryGiftBox3D({
  size = [1, 0.9, 1],
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  lidRef,
}: LuxuryGiftBox3DProps) {
  const [w, h, d] = size;
  const bowScale = Math.min(w, d);

  const velvetMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#0e0c12',
        roughness: 0.68,
        metalness: 0.12,
        sheen: 0.65,
        sheenRoughness: 0.55,
        sheenColor: new THREE.Color('#2d2538'),
      }),
    []
  );

  const satinGoldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f5cf6b',
        metalness: 0.92,
        roughness: 0.18,
        bumpMap: getGoldLeafBumpTexture(),
        bumpScale: 0.004,
      }),
    []
  );

  const geometries = useMemo(() => {
    const ribbonW = Math.min(w, d) * 0.14;
    const baseRibbonX = createExtrudedRibbonGeometry(h * 0.99, ribbonW, d + 0.018);
    const baseRibbonZ = createExtrudedRibbonGeometry(h * 0.99, ribbonW, w + 0.018);
    const lidH = h * 0.2;
    const lidRibbonX = createExtrudedRibbonGeometry(lidH * 1.04, ribbonW * 1.05, d * 1.08 + 0.018);
    const lidRibbonZ = createExtrudedRibbonGeometry(lidH * 1.04, ribbonW * 1.05, w * 1.08 + 0.018);

    const loopLeftA = createBowLoopCurve(-1, bowScale);
    const loopRightA = createBowLoopCurve(1, bowScale);
    return { baseRibbonX, baseRibbonZ, lidRibbonX, lidRibbonZ, loopLeftA, loopRightA };
  }, [w, h, d, bowScale]);

  useEffect(() => {
    return () => {
      velvetMat.dispose();
      satinGoldMat.dispose();
      Object.values(geometries).forEach((g) => g.dispose());
    };
  }, [velvetMat, satinGoldMat, geometries]);

  const lidH = h * 0.2;
  const lidY = h * 0.5 + lidH * 0.35;

  return (
    <group position={position} rotation={rotation}>
      {/* Beveled Velvet-Black Base */}
      <RoundedBox
        args={[w, h, d]}
        radius={Math.min(w, h, d) * 0.045}
        smoothness={4}
        material={velvetMat}
        castShadow
        receiveShadow
      />

      {/* Extruded Metallic Satin Gold Ribbons on Base */}
      <mesh geometry={geometries.baseRibbonX} material={satinGoldMat} castShadow />
      <mesh
        geometry={geometries.baseRibbonZ}
        material={satinGoldMat}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
      />

      {/* Separate Overlapping Beveled Lid + Sculpted 3D Bow */}
      <group ref={lidRef} position={[0, lidY, 0]}>
        <RoundedBox
          args={[w * 1.08, lidH, d * 1.08]}
          radius={Math.min(w, d) * 0.04}
          smoothness={4}
          material={velvetMat}
          castShadow
          receiveShadow
        />
        <mesh geometry={geometries.lidRibbonX} material={satinGoldMat} castShadow />
        <mesh
          geometry={geometries.lidRibbonZ}
          material={satinGoldMat}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
        />

        {/* Sculpted 3D Bow on Lid Top */}
        <group position={[0, lidH * 0.5, 0]}>
          <mesh material={satinGoldMat} castShadow>
            <sphereGeometry args={[0.068 * bowScale, 16, 16]} />
          </mesh>
          <mesh
            geometry={geometries.loopLeftA}
            material={satinGoldMat}
            rotation={[0, 0.28, 0]}
            castShadow
          />
          <mesh
            geometry={geometries.loopRightA}
            material={satinGoldMat}
            rotation={[0, -0.28, 0]}
            castShadow
          />
          <mesh
            geometry={geometries.loopLeftA}
            material={satinGoldMat}
            rotation={[0, Math.PI / 2 + 0.28, 0]}
            castShadow
          />
          <mesh
            geometry={geometries.loopRightA}
            material={satinGoldMat}
            rotation={[0, Math.PI / 2 - 0.28, 0]}
            castShadow
          />
        </group>
      </group>
    </group>
  );
}
