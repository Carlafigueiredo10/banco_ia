// Projeta o GeoJSON dos estados (local, versionado — sem API externa em runtime)
// para paths SVG. Roda no SERVIDOR: o cliente recebe só os contornos prontos.
/* eslint-disable @typescript-eslint/no-explicit-any */
import geo from "./br-states.min.json";

const W = 460;

type Coord = [number, number];

function eachCoord(geom: any, cb: (c: Coord) => void) {
  if (geom.type === "Polygon") geom.coordinates.forEach((r: Coord[]) => r.forEach(cb));
  else geom.coordinates.forEach((p: Coord[][]) => p.forEach((r) => r.forEach(cb)));
}

// Bounding box do Brasil
let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
for (const f of (geo as any).features) {
  eachCoord(f.geometry, ([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
}
const lngRange = maxLng - minLng;
const latRange = maxLat - minLat;
const scale = W / lngRange;
const H = Math.round(latRange * scale);

function proj(lng: number, lat: number): Coord {
  return [(lng - minLng) * scale, (maxLat - lat) * scale];
}

function ringToPath(r: Coord[]): string {
  return (
    r
      .map(([lng, lat], i) => {
        const [x, y] = proj(lng, lat);
        return (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
      })
      .join(" ") + "Z"
  );
}

function geomToPath(geom: any): string {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  return polys.map((poly: Coord[][]) => poly.map(ringToPath).join(" ")).join(" ");
}

// Centroide aproximado (média do maior anel) para posicionar o rótulo da UF.
function centroide(geom: any): Coord {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let maior: Coord[] | null = null;
  let maiorLen = 0;
  for (const poly of polys) {
    const anel = poly[0];
    if (anel && anel.length > maiorLen) {
      maiorLen = anel.length;
      maior = anel;
    }
  }
  if (!maior) return [0, 0];
  let sx = 0, sy = 0;
  for (const [lng, lat] of maior) {
    const [x, y] = proj(lng, lat);
    sx += x;
    sy += y;
  }
  return [sx / maior.length, sy / maior.length];
}

export const MAPA_BR = {
  W,
  H,
  estados: (geo as any).features.map((f: any) => ({
    uf: f.properties.SIGLA as string,
    d: geomToPath(f.geometry),
    c: centroide(f.geometry),
  })) as { uf: string; d: string; c: Coord }[],
};
