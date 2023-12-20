import * as fs from "fs";

interface CubeSet {
  red: number;
  green: number;
  blue: number;
}

interface Game {
  index: number;
  sets: CubeSet[];
  maxSet: CubeSet;
}

enum Token {
  Word,
  Colon,
  Comma,
  Semicolon,
}

interface TokenExt {
  token: Token;
  word?: string;
}

function ensure(condition: boolean, message: string) {
  if (!condition) {
    throw Error(message);
  }
}

function parseLine(s: string): Game {
  let tokens: TokenExt[] = [];

  let from = 0;
  for (let i = 0; i < s.length; ++i) {
    const ch = s[i];
    const isAlnum =
      (ch >= "a" && ch <= "z") ||
      (ch >= "A" && ch <= "Z") ||
      (ch >= "0" && ch <= "9");
    if (isAlnum) {
      continue;
    }
    if (from < i) {
      tokens.push({ token: Token.Word, word: s.slice(from, i) });
    }
    switch (ch) {
      case ":":
        tokens.push({ token: Token.Colon });
        break;
      case ",":
        tokens.push({ token: Token.Comma });
        break;
      case ";":
        tokens.push({ token: Token.Semicolon });
        break;
      case " ":
      case "\t":
        break;
      default:
        throw Error(`unexpected symbol '${ch}'`);
    }
    from = i + 1;
  }
  if (from < s.length) {
    tokens.push({ token: Token.Word, word: s.slice(from) });
  }
  tokens.push({ token: Token.Semicolon });

  return parseTokens(tokens);
}

function parseTokens(tokens: TokenExt[]): Game {
  let t = 0;
  const next = (token: Token): TokenExt => {
    const tok = tokens[t++];
    ensure(
      tok.token == token,
      `expected ${Token[token]}, got ${Token[tok.token]}:"${tok.word}`,
    );
    return tok;
  };
  const next2 = (token: Token, token2: Token): TokenExt => {
    const tok = tokens[t++];
    ensure(
      tok.token == token || tok.token == token2,
      `expected ${Token[token]} or ${Token[token2]}, got ${Token[tok.token]}:"${
        tok.word
      }`,
    );
    return tok;
  };

  const game: Game = {
    index: -1,
    sets: [],
    maxSet: {
      red: 0,
      green: 0,
      blue: 0,
    },
  };

  ensure(next(Token.Word).word === "Game", "no Game");
  game.index = +next(Token.Word).word;
  next(Token.Colon);

  let currentSet = {
    red: 0,
    green: 0,
    blue: 0,
  };
  while (t < tokens.length) {
    const num = +next(Token.Word).word;
    const color = next(Token.Word).word;
    switch (color) {
      case "red":
        currentSet.red = num;
        break;
      case "green":
        currentSet.green = num;
        break;
      case "blue":
        currentSet.blue = num;
        break;
      default:
        ensure(false, `unexpected word: ${color}`);
    }
    const delim = next2(Token.Comma, Token.Semicolon);
    if (delim.token === Token.Semicolon) {
      game.sets.push(currentSet);
      game.maxSet.red = Math.max(game.maxSet.red, currentSet.red);
      game.maxSet.green = Math.max(game.maxSet.green, currentSet.green);
      game.maxSet.blue = Math.max(game.maxSet.blue, currentSet.blue);
      currentSet = {
        red: 0,
        green: 0,
        blue: 0,
      };
    }
  }
  return game;
}

function fits(s: CubeSet, limits: CubeSet) {
  return (
    s.red <= limits.red && s.green <= limits.green && s.blue <= limits.blue
  );
}

const data = fs.readFileSync(0, { encoding: "utf8", flag: "r" });

let sum = 0;
for (const line of data.split("\n")) {
  if (line.length === 0) {
    continue;
  }
  const game = parseLine(line);
  const power = game.maxSet.red * game.maxSet.green * game.maxSet.blue;
  sum += power;
}
console.log(sum);
