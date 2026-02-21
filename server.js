const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== "production";

console.log(`> Starting PrintPrep (NODE_ENV=${process.env.NODE_ENV}, PORT=${port})`);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, "0.0.0.0", () => {
    console.log(`> PrintPrep ready on http://0.0.0.0:${port}`);
  });
}).catch((err) => {
  console.error("> PrintPrep failed to start:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("> Uncaught exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("> Unhandled rejection:", err);
});
