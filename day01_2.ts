import * as fs from "fs";

const reDigit = /\d|one|two|three|four|five|six|seven|eight|nine/;
const digits: { [key: string]: number } = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

const data = fs.readFileSync(0, { encoding: "utf8", flag: "r" });

let sum = 0;

for (const line of data.split("\n")) {
  let first = -1;
  let last = -1;

  let matches;
  let suffix = line;
  while ((matches = suffix.match(reDigit)) !== null) {
    last = toDigit(matches[0]);
    if (first === -1) {
      first = last;
    }
    // digits can overlap, normal regex loop doesn't work
    suffix = suffix.slice(matches.index + 1);
  }
  if (first > 0) {
    sum += first * 10 + last;
  }
}
console.log(sum);

function toDigit(s: string): number {
  if (s.length === 1) {
    return +s;
  }
  return digits[s];
}
