// 줄 단위 LCS diff. 결과: [{op: 'same'|'add'|'del', line}]
export function diffLines(a, b) {
  // 앞뒤 공통 구간을 먼저 잘라 표 크기를 줄인다
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length, endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }

  const A = a.slice(start, endA), B = b.slice(start, endB);
  const n = A.length, m = B.length;
  const ops = [];
  if (n * m > 4_000_000) {
    A.forEach(line => ops.push({ op: 'del', line }));
    B.forEach(line => ops.push({ op: 'add', line }));
  } else {
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { ops.push({ op: 'same', line: A[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ op: 'del', line: A[i++] });
      else ops.push({ op: 'add', line: B[j++] });
    }
    while (i < n) ops.push({ op: 'del', line: A[i++] });
    while (j < m) ops.push({ op: 'add', line: B[j++] });
  }
  return [
    ...a.slice(0, start).map(line => ({ op: 'same', line })),
    ...ops,
    ...a.slice(endA).map(line => ({ op: 'same', line })),
  ];
}

export function diffSpecs(prev = [], next = []) {
  const key = s => s.kind + '|' + s.value;
  const p = new Set(prev.map(key)), n = new Set(next.map(key));
  return {
    added: next.filter(s => !p.has(key(s))),
    removed: prev.filter(s => !n.has(key(s))),
  };
}
