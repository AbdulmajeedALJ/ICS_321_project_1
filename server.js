const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const app = require("./app");

dotenv.config({ path: "./config.env" });

const PORT = Number(process.env.PORT) || 3000;
let server;
let dbPool;

const requiredDbEnv = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
const missingDbEnv = requiredDbEnv.filter((key) => !process.env[key]);

if (missingDbEnv.length) {
  console.error(
    `Missing database environment variables: ${missingDbEnv.join(", ")}`
  );
  process.exit(1);
}

async function startServer() {
  try {
    dbPool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    });

    app.locals.db = dbPool;
    app.locals.query = (sql, params = []) => dbPool.execute(sql, params);

    await dbPool.query("SELECT 1");
    console.log("Connected to MySQL successfully");

    server = app.listen(PORT, () => {
      console.log("listening.. port :", PORT);
    });
  } catch (err) {
    console.error("Failed to initialize MySQL connection");
    console.error(err);
    process.exit(1);
  }
}

startServer();

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Closing server and MySQL pool...");
  if (server) {
    server.close();
  }
  if (dbPool) {
    await dbPool.end();
  }
  process.exit(0);
});
