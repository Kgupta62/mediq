const SKIP = /^\/health$|\.(ico|png|jpg|svg|css|js|map|txt|woff2?)$/;
const useColor = process.stdout.isTTY;
const paint = (code, text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);

export const requestLogger = (req, res, next) => {
  if (SKIP.test(req.path)) return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const code = res.statusCode >= 500 ? 31 : res.statusCode >= 400 ? 33 : 32;
    console.log(`${paint(code, res.statusCode)} ${req.method} ${req.originalUrl} ${ms.toFixed(1)}ms`);
  });
  next();
};
