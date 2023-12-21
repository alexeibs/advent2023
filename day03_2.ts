import * as fs from "fs";

interface NumberToken {
  num: number;
  begin: number;
  end: number;
}

type SymbolMap = { [pos: number]: number[] };

interface ParsedLine {
  numbers: NumberToken[];
  symbols: SymbolMap;
}

function parseLine(line: string): ParsedLine {
  const pl: ParsedLine = {
    numbers: [],
    symbols: {},
  };
  let numPos = 0;
  for (let i = 0; i < line.length; ++i) {
    const ch = line[i];
    if ("0" <= ch && ch <= "9") {
      continue;
    }
    if (numPos < i) {
      pl.numbers.push({ num: +line.slice(numPos, i), begin: numPos, end: i });
    }
    numPos = i + 1;
    if (ch === "*") {
      pl.symbols[i] = [];
    }
  }
  if (numPos < line.length) {
    pl.numbers.push({
      num: +line.slice(numPos),
      begin: numPos,
      end: line.length,
    });
  }
  return pl;
}

function findAdjacentSymbols(nums: NumberToken[], symbols: SymbolMap[]): void {
  for (const s of symbols) {
    for (const num of nums) {
      for (let i = num.begin - 1; i <= num.end; ++i) {
        if (s[i] !== undefined && s[i].length < 3) {
          s[i].push(num.num);
        }
      }
    }
  }
}

function sumGearRatios(symbols: SymbolMap): number {
  let sum = 0;
  for (const pos in symbols) {
    const nums = symbols[pos];
    if (nums.length === 2) {
      sum += nums[0] * nums[1];
    }
  }
  return sum;
}

const data = fs.readFileSync(0, { encoding: "utf8", flag: "r" });

let symbolMaps: SymbolMap[] = [{}, {}, {}];
let oldestMap = 0;
let prevNumbers: NumberToken[] = [];
let currentNumbers: NumberToken[] = [];

let sum = 0;

for (const line of data.split("\n")) {
  const { numbers, symbols } = parseLine(line);

  sum += sumGearRatios(symbolMaps[oldestMap]);

  symbolMaps[oldestMap] = symbols;
  oldestMap = (oldestMap + 1) % symbolMaps.length;

  prevNumbers = currentNumbers;
  currentNumbers = numbers;

  findAdjacentSymbols(prevNumbers, symbolMaps);
}

sum += sumGearRatios(symbolMaps[oldestMap]);

symbolMaps[oldestMap] = {};
findAdjacentSymbols(currentNumbers, symbolMaps);

sum += sumGearRatios(symbolMaps[(oldestMap + 1) % 3]);
sum += sumGearRatios(symbolMaps[(oldestMap + 2) % 3]);

console.log(sum);
