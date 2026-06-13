export const productionLogger = {
  level: "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.body.token",
      "req.body.refreshToken",
      "request.headers.authorization",
      "request.body.token",
      "request.body.refreshToken",
    ],
    censor: "[REDACTED]",
  },
};
