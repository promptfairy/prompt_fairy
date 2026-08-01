const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 5177);
const host = process.env.HOST || "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${host}:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  let filePath = path.join(root, pathname);

  if (pathname === "/" || pathname.endsWith("/")) {
    filePath = path.join(root, pathname, "index.html");
  }

  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(resolvedPath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(resolvedPath)] || "application/octet-stream"
    });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`胖譜小精靈 running at http://${host}:${port}/`);
  console.log(`調製台: http://${host}:${port}/_experiments/recipe-engine-v1/#workspace`);
});
