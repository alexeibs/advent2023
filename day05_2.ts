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

//- parsing input --------------------------------------------------------------

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
  m.ranges.sort((a, b) => a.src - b.src);
  node.set(m.cat.dst, m);
}

//- optimising data structs after the input got parsed -------------------------

function findRoute(
  g: Graph,
  src: string,
  dst: string,
  out: FullMap[],
): boolean {
  const srcNode = g.get(src);
  if (srcNode == null) {
    return false;
  }
  const dstMap = srcNode.get(dst);
  if (dstMap != null) {
    out.push(dstMap);
    return true;
  }
  for (const [cat, map] of srcNode.entries()) {
    // ignore potential loops for now
    out.push(map);
    const found = findRoute(g, cat, dst, out);
    if (found) {
      return true;
    }
    out.pop();
  }
  return false;
}

// ported from C++
// https://en.cppreference.com/w/cpp/algorithm/lower_bound
function lowerBound<T>(
  arr: T[],
  first: number,
  last: number,
  value: T,
  less: (a: T, b: T) => boolean,
): number {
  let it = 0;
  let step = 0;
  let count = last - first;

  while (count > 0) {
    step = count >> 1;
    it = first + step;

    if (less(arr[it], value)) {
      first = ++it;
      count -= step + 1;
    } else {
      count = step;
    }
  }

  return first;
}

interface MinMax {
  min: number;
  max: number;
}

function srcLimits(sortedRanges: RangeMap[]): MinMax {
  if (sortedRanges.length === 0) {
    return { min: +Infinity, max: -Infinity };
  }
  const last = sortedRanges[sortedRanges.length - 1];
  return { min: sortedRanges[0].src, max: last.src + last.size };
}

// sort by `src` and fill in the "gaps"
function fillSrcGaps(sortedRanges: RangeMap[], limits: MinMax): RangeMap[] {
  const result: RangeMap[] = [];

  const rlim = srcLimits(sortedRanges);
  const min = Math.min(limits.min, rlim.min);
  const max = Math.max(limits.max, rlim.max);

  ensure(min < max, `expected min < max, got ${min} >= ${max}`);

  let curMax = min;
  for (const r of sortedRanges) {
    if (curMax < r.src) {
      result.push({ src: curMax, dst: curMax, size: r.src - curMax });
    }
    result.push(r);
    curMax = r.src + r.size;
  }
  if (curMax < max) {
    result.push({ src: curMax, dst: curMax, size: max - curMax });
  }

  return result;
}

function splitRange(
  range: RangeMap,
  splitters: RangeMap[],
  out: RangeMap[],
): void {
  if (splitters.length === 0) {
    out.push(range);
    return;
  }

  const min = range.dst;
  const max = range.dst + range.size;
  const offset = range.dst - range.src;

  const minRange: RangeMap = { src: min, dst: min, size: 0 };
  let i = lowerBound(
    splitters,
    0,
    splitters.length,
    minRange,
    (a, b) => a.src < b.src,
  );
  if ((i === splitters.length || splitters[i].src > min) && i > 0) {
    --i;
  }

  let last = min;
  for (; i < splitters.length; ++i) {
    const sp = splitters[i];
    if (sp.src >= max) {
      break;
    }
    if (sp.src + sp.size <= min) {
      continue;
    }
    if (sp.src > last) {
      out.push({ src: last - offset, dst: last, size: sp.src - last });
    }
    const spFirst = Math.max(last, sp.src);
    last = Math.min(sp.src + sp.size, max);
    out.push({
      src: spFirst - offset,
      dst: sp.dst + spFirst - sp.src,
      size: last - spFirst,
    });
  }
  if (last < max) {
    out.push({ src: last - offset, dst: last, size: max - last });
  }
}

// combine mappings (a -> b) and (b -> c) into (a -> c)
//   "left" represents (a -> b) mappings
//   "right represents (b -> c) mappings
// returns combined (a -> c) mappings
//
// if "fillGaps" is set, "left" side mappings get extended so they fully cover
// the input range of "right" side
function combineMappings(
  left: RangeMap[],
  right: RangeMap[],
  fillGaps: boolean,
): RangeMap[] {
  if (right.length === 0) {
    return left;
  }
  const rlim: MinMax = srcLimits(right);

  const leftExt = fillGaps ? fillSrcGaps(left, rlim) : left;

  let out: RangeMap[] = [];
  for (const lr of leftExt) {
    splitRange(lr, right, out);
  }

  return out;
}

function combineRouteMappings(route: FullMap[]): RangeMap[] {
  let out: RangeMap[] = [];
  for (let i = route.length - 1; i >= 0; --i) {
    out = combineMappings(route[i].ranges, out, /*fillGaps*/ true);
  }
  return out;
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

ensure(seeds.length % 2 == 0, "expected seeds to be specified in pairs");

let route: FullMap[] = [];
const foundRoute = findRoute(graph, "seed", "location", route);
ensure(foundRoute, "cannot map seeds to locations");

const routeRanges: RangeMap[] = combineRouteMappings(route);
let seedRanges: RangeMap[] = [];

for (let i = 0; i < seeds.length; i += 2) {
  const first = seeds[i];
  const nSeeds = seeds[i + 1];
  seedRanges.push({ src: first, dst: first, size: nSeeds });
}
seedRanges.sort((a, b) => a.src - b.src);
seedRanges = combineMappings(seedRanges, routeRanges, /*fillGaps*/ false);

let minSeed = Infinity;
for (const sr of seedRanges) {
  minSeed = Math.min(minSeed, sr.dst);
}

console.log(minSeed);
