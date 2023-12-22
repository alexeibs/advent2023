import * as fs from "fs";

interface RangeMap {
  src: number;
  dst: number;
  size: number;
}

interface MapType {
  src: string;
  dst: string;
}

interface FullMap {
  cat: MapType;
  ranges: RangeMap[];
}

type Graph = Map<string, Map<string, FullMap>>;

function toInt(s: string): number {
  const n = parseInt(s);
  ensure(n == n, `"${s}" is not a valid int`);
  return n;
}

function ensure(condition: boolean, message: string): void {
  if (!condition) {
    throw Error(message);
  }
}

function parseNumbers(s: string): number[] {
  const out: number[] = [];
  for (const p of s.split(" ")) {
    if (p.length === 0) {
      continue;
    }
    out.push(toInt(p));
  }
  return out;
}

function parseSeeds(s: string): number[] {
  const parts = s.split(":");
  ensure(parts.length === 2, "bad seeds format");
  ensure(parts[0].trim() == "seeds", "expected seeds prefix");

  return parseNumbers(parts[1]);
}

function parseRangeMap(s: string): RangeMap {
  const numbers = parseNumbers(s);
  ensure(numbers.length === 3, "3 numbers expected");
  return {
    dst: numbers[0],
    src: numbers[1],
    size: numbers[2],
  };
}

const mapRe = /(\w+)-to-(\w+)\s+map\s*:/;

function parseMapHeader(s: string): MapType | null {
  const matches = s.match(mapRe);
  if (matches == null) {
    return null;
  }
  return {
    src: matches[1],
    dst: matches[2],
  };
}

function addMap(g: Graph, m: FullMap): void {
  let node = g.get(m.cat.src);
  if (node == null) {
    node = new Map<string, FullMap>();
    g.set(m.cat.src, node);
  }
  node.set(m.cat.dst, m);
}

function remap(g: Graph, src: string, dst: string, id: number): number | null {
  const srcNode = g.get(src);
  ensure(srcNode != null, `cannot find "${src}" category`);
  const dstMap = srcNode.get(dst);
  if (dstMap != null) {
    return remapByRanges(id, dstMap.ranges);
  }
  for (const [cat, map] of srcNode.entries()) {
    // ignore potential loops for now
    const remapped = remap(g, cat, dst, remapByRanges(id, map.ranges));
    if (remapped != null) {
      return remapped;
    }
  }
  return null;
}

function remapByRanges(id: number, ranges: RangeMap[]): number {
  // suboptimal, but good enough
  for (const r of ranges) {
    if (r.src <= id && id < r.src + r.size) {
      return id - r.src + r.dst;
    }
  }
  return id;
}

const data = fs.readFileSync(0, { encoding: "utf8", flag: "r" });

let first = true;
let seeds: number[] = [];
let graph: Graph = new Map();
let cat: MapType | null = null;
let ranges: RangeMap[] = [];

for (const line of data.split("\n")) {
  const tl = line.trim();
  if (tl.length === 0) {
    continue;
  }
  if (first) {
    seeds = parseSeeds(tl);
    first = false;
  } else {
    const header = parseMapHeader(tl);
    if (header == null) {
      ensure(cat != null, "missing map header");
      ranges.push(parseRangeMap(tl));
    } else {
      if (cat != null) {
        addMap(graph, { cat, ranges });
      }
      cat = header;
      ranges = [];
    }
  }
}
if (cat != null) {
  addMap(graph, { cat, ranges });
}

let minSeed = Infinity;
for (const seed of seeds) {
  minSeed = Math.min(minSeed, remap(graph, "seed", "location", seed));
}

console.log(minSeed);
