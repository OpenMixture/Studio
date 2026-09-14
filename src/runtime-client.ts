import { loadRuntime, type RenderRequest, type RuntimeModule } from '@openmixture/runtime';

/** Each application owns its module load; importing this file acquires no GPU. */
export function runtimeClient(): () => Promise<RuntimeModule> {
  let pending: Promise<RuntimeModule> | undefined;
  return () => pending ??= loadRuntime().catch(error => { pending = undefined; throw error; });
}

export interface RenderJob { source: Uint8Array; name: string; request: RenderRequest; }
export function captureJob(source: Uint8Array, name: string, request: RenderRequest): RenderJob {
  return { source: source.slice(), name, request: structuredClone(request) };
}
