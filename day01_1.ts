import * as fs from "fs";

const kDigits = "09";
const kZero = kDigits.charCodeAt(0);
const kNine = kDigits.charCodeAt(1);

const data = fs.readFileSync(0, { encoding: "utf8", flag: "r" });

let sum = 0;

for (const line of data.split("\n")) {
  let first = -1;
  let last = -1;
  for (let i = 0; i < line.length; ++i) {
    const ch = line.charCodeAt(i);
    if (kZero <= ch && ch <= kNine) {
      last = ch - kZero;
      if (first == -1) {
        first = last;
      }
    }
  }
  if (first > 0) {
    sum += first * 10 + last;
  }
}
console.log(sum);
