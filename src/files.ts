export async function sampleBytes(base: string, name: string): Promise<Uint8Array> {
  const response = await fetch(`${base}samples/${name}.mix`);
  if (!response.ok) throw new Error(`Could not load ${name}.mix (HTTP ${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function fileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}
