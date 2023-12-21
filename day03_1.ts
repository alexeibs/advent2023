import * as fs from "fs";

interface NumberToken {
  num: number;
  begin: number;
  end: number;
}

type SymbolMap = { [pos: number]: number };

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
    if (ch === ".") {
      continue;
    }
    pl.symbols[i] = line.charCodeAt(i);
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

function filterNumbers(nums: NumberToken[], symbols: SymbolMap[]): number {
  let sum = 0;
  for (const num of nums) {
    let added = false;
    for (const s of symbols) {
      for (let i = num.begin - 1; i <= num.end; ++i) {
        if (s[i] !== undefined) {
          sum += num.num;
          break;
        }
      }
      if (added) {
        break;
      }
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

  symbolMaps[oldestMap] = symbols;
  oldestMap = (oldestMap + 1) % symbolMaps.length;

  prevNumbers = currentNumbers;
  currentNumbers = numbers;

  sum += filterNumbers(prevNumbers, symbolMaps);
}

symbolMaps[oldestMap] = {};
sum += filterNumbers(currentNumbers, symbolMaps);

console.log(sum);
