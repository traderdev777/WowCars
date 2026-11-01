/* eslint-disable @typescript-eslint/no-require-imports */
// server.js — Phusion Passenger Entrypoint for cPanel / CloudLinux Node.js
// WowCars Zero-Budget Production Startup Script

const path = require("path");
const fs = require("fs");

// Check if Next.js standalone build is available
const standaloneServer = path.join(__dirname, ".next", "standalone", "server.js");

if (fs.existsSync(standaloneServer)) {
  // Delegate directly to Next.js standalone production server
  require(standaloneServer);
} else {
  // Standard Next.js custom server fallback
  const { createServer } = require("http");
  const { parse } = require("url");
  const next = require("next");

  const dev = process.env.NODE_ENV !== "production";
  const rawPort = process.env.PORT;
  const isNamedPipe = rawPort && (isNaN(Number(rawPort)) || String(rawPort).startsWith("/") || String(rawPort).startsWith("\\\\"));
  const port = isNamedPipe ? rawPort : (parseInt(rawPort, 10) || 3000);
  const hostname = process.env.HOSTNAME || "0.0.0.0";

  const app = next({
    dev,
    ...(isNamedPipe ? {} : { hostname, port: Number(port) }),
  });
  const handle = app.getRequestHandler();

  app
    .prepare()
    .then(() => {
      createServer(async (req, res) => {
        try {
          const parsedUrl = parse(req.url, true);
          await handle(req, res, parsedUrl);
        } catch (err) {
          console.error("Unhandled server error:", req.url, err);
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      })
        .once("error", (err) => {
          console.error("Passenger HTTP server error:", err);
          process.exit(1);
        })
        .listen(port, () => {
          console.log(`> WowCars listening on ${port} (PID: ${process.pid}, Node: ${process.version})`);
        });
    })
    .catch((err) => {
      console.error("Failed to prepare Next.js application:", err);
      process.exit(1);
    });
}

