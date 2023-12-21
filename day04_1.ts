import * as fs from "fs";

interface Card {
  win: Set<number>;
  you: Set<number>;
}

function parseNumbers(s: string, out: Set<number>): void {
  for (const p of s.split(" ")) {
    if (p == "") {
      continue;
    }
    out.add(+p);
  }
}

function parseCard(s: string): Card {
  const card: Card = {
    win: new Set<number>(),
    you: new Set<number>(),
  };
  const colon = s.indexOf(":");
  if (colon === -1) {
    return card;
  }
  const mid = s.indexOf("|", colon + 1);
  if (mid === -1) {
    return card;
  }
  parseNumbers(s.slice(colon + 1, mid), card.win);
  parseNumbers(s.slice(mid + 1), card.you);
  return card;
}

function score(card: Card): number {
  let cnt = 0;
  for (const n of card.you) {
    if (card.win.has(n)) {
      ++cnt;
    }
  }
  return cnt == 0 ? 0 : 1 << (cnt - 1);
}

const data = fs.readFileSync(0, { encoding: "utf8", flag: "r" });

let sum = 0;

for (const line of data.split("\n")) {
  const card = parseCard(line);
  sum += score(card);
}

console.log(sum);
