const blockedPatterns = [
  /\bf+u+c+k+\b/i,
  /\bs+h+i+t+\b/i,
  /\bb+i+t+c+h+\b/i,
  /\ba+s+s+h+o+l+e+\b/i,
  /\bd+a+m+n+\b/i,
  /\bc+r+a+p+\b/i,
  /\bd+i+c+k+\b/i,
  /\bp+u+s+s+y+\b/i,
  /\bc+u+n+t+\b/i,
  /\bn+i+g+g+e+r+\b/i,
  /\bf+a+g+g+o+t+\b/i,
  /\br+e+t+a+r+d+\b/i,
  /\bk+i+l+l\s+(yourself|urself|u)\b/i,
  /\b(kys|die|go\s+die)\b/i,
  /\b(stupid|dumb|idiot|moron|loser|trash|worthless|ugly|fat|shut\s+up)\b/i,
  /\b(i\s+hate\s+you|you\s+are\s+(stupid|dumb|ugly|worthless|trash))\b/i,
];

export const isMessageAllowed = (message: string) =>
  !blockedPatterns.some(pattern => pattern.test(message));
