/**
 * Porcellana's stage (docs/plan-porcellana.md § 1 and 3): the light, the soft shadows, the ambient
 * occlusion, the neutral tone mapping, the background and the shadow catcher under the board, the
 * same in every scene. It renders the frame itself (GTAO, as the prototype), at priority 1.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  type DirectionalLight,
  HalfFloatType,
  type HemisphereLight,
  NeutralToneMapping,
  PCFShadowMap,
  type Vector3,
  WebGLRenderTarget,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { COL, LIGHT } from "./tokens.js";

export interface StageProps {
  /** Where the camera looks: the sun's shadow box follows it. */
  target: Vector3;
  /** A small device: a smaller shadow map. */
  phone?: boolean;
  /** No occlusion (a weak device, or software GL). */
  plain?: boolean;
  /** The background (the lands of Rome take their biscuit). */
  background?: string;
  /** The world's scale against the kit's (a battle's chart is larger): the shadows reach it all. */
  scale?: number;
  /** No shadow catcher under the board (an island stands on its own water). */
  bare?: boolean;
}

export function Stage({
  target,
  phone = false,
  plain = false,
  background = COL.bg,
  scale = 1,
  bare = false,
}: StageProps) {
  const { gl, scene, camera, size } = useThree();
  const sun = useRef<DirectionalLight>(null);
  const sky = useRef<HemisphereLight>(null);

  useLayoutEffect(() => {
    gl.toneMapping = NeutralToneMapping;
    gl.toneMappingExposure = LIGHT.exposure;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = PCFShadowMap;
    scene.background = new Color(background);
  }, [gl, scene, background]);

  const composer = useMemo(() => {
    // A phone draws without the occlusion: its GPU's memory is short (a page killed is a white screen).
    if (plain || phone) return null;
    const rt = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 });
    const c = new EffectComposer(gl, rt);
    c.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, 1, 1);
    ao.updateGtaoMaterial({
      radius: LIGHT.ao.radius,
      distanceExponent: LIGHT.ao.distanceExponent,
      thickness: LIGHT.ao.thickness,
      scale: LIGHT.ao.scale,
      samples: 16,
    });
    ao.updatePdMaterial({
      lumaPhi: 10,
      depthPhi: 2,
      normalPhi: 3,
      radius: 6,
      rings: 2,
      samples: 16,
    });
    ao.blendIntensity = LIGHT.ao.blend;
    c.addPass(ao);
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera, plain, phone]);

  useEffect(() => {
    if (!composer) return;
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size.width, size.height]);
  useEffect(() => () => composer?.dispose(), [composer]);

  useFrame(() => {
    const s = sun.current;
    if (s) {
      const [ox, oy, oz] = LIGHT.sun.offset;
      s.position.set(target.x + ox * scale, oy * scale, target.z + oz * scale);
      s.target.position.copy(target);
      s.target.updateMatrixWorld();
    }
    if (composer) composer.render();
    else gl.render(scene, camera);
  }, 1);

  const map = phone ? LIGHT.shadow.mapPhone : LIGHT.shadow.mapDesk;
  const e = LIGHT.shadow.extent * scale;
  return (
    <>
      <hemisphereLight ref={sky} args={[LIGHT.hemi.sky, LIGHT.hemi.ground, LIGHT.hemi.intensity]} />
      <directionalLight
        ref={sun}
        color={LIGHT.sun.colour}
        intensity={LIGHT.sun.intensity}
        castShadow
        shadow-mapSize={[map, map]}
        shadow-camera-left={-e}
        shadow-camera-right={e}
        shadow-camera-top={e}
        shadow-camera-bottom={-e}
        shadow-camera-near={1}
        shadow-camera-far={120 * scale}
        shadow-bias={LIGHT.shadow.bias}
        shadow-normalBias={LIGHT.shadow.normalBias}
        shadow-radius={LIGHT.shadow.radius}
      />
      <directionalLight
        color={LIGHT.fill.colour}
        intensity={LIGHT.fill.intensity}
        position={LIGHT.fill.position}
      />
      {bare ? null : (
        <mesh rotation-x={-Math.PI / 2} position-y={LIGHT.catcher.y * scale} receiveShadow>
          <planeGeometry args={[400 * scale, 400 * scale]} />
          <shadowMaterial opacity={LIGHT.catcher.opacity} />
        </mesh>
      )}
    </>
  );
}
