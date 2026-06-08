const fs = require("fs");
const path = require("path");

const API_DIRS = ["app/api", "src/app/api"];

function walk(dir) {
  let files = [];

  if (!fs.existsSync(dir)) return files;

  const ignore = ["node_modules", ".next", ".git", "dist", "build"];

  for (const file of fs.readdirSync(dir)) {
    if (ignore.includes(file)) continue;

    const full = path.join(dir, file);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      files = files.concat(walk(full));
    } else if (file === "route.ts" || file === "route.js") {
      files.push(full);
    }
  }

  return files;
}

function getEndpoint(file) {
  return (
    "/" +
    file
      .replace(/\\/g, "/")
      .replace(/^src\/app/, "")
      .replace(/^app/, "")
      .replace(/\/route\.(ts|js)$/, "")
  );
}

function getMethods(content) {
  const methods = [];
  ["GET", "POST", "PUT", "PATCH", "DELETE"].forEach((m) => {
    if (content.includes(`export async function ${m}`)) {
      methods.push(m);
    }
  });
  return methods;
}

function getBodyFields(content) {
  const fields = new Set();
  const regex = /body\.([a-zA-Z0-9_]+)/g;

  let match;
  while ((match = regex.exec(content))) {
    fields.add(match[1]);
  }

  return [...fields];
}

function getQueryFields(content) {
  const fields = new Set();
  const regex = /searchParams\.get\(["'`](.*?)["'`]\)/g;

  let match;
  while ((match = regex.exec(content))) {
    fields.add(match[1]);
  }

  return [...fields];
}

function detectResponse(content) {
  const success = new Set();
  const error = new Set();
  const status = new Set();

  // SUCCESS
  if (content.includes("success: true")) {
    success.add("success: true");
  }

  // ERROR MESSAGE (error: "...")
  const errorRegex = /error:\s*["'`](.*?)["'`]/g;
  let m;

  while ((m = errorRegex.exec(content))) {
    error.add(m[1]);
  }

  // STATUS CODE
  const statusRegex = /status\s*:\s*(\d{3})/g;
  let m2;

  while ((m2 = statusRegex.exec(content))) {
    status.add(m2[1]);
  }

  // fallback known errors
  const knownErrors = [
    "Invalid Credentials",
    "Wrong password",
    "User not found",
    "Tenant not found",
    "Register failed",
    "Unauthorized",
    "Forbidden",
    "Token expired",
    "Something went wrong",
  ];

  for (const err of knownErrors) {
    if (content.includes(err)) {
      error.add(err);
    }
  }

  return {
    success: [...success],
    error: [...error],
    status: [...status],
  };
}

function formatBody(fields) {
  if (!fields.length) return "-";

  let obj = "{\n";

  fields.forEach((f, i) => {
    obj += `  "${f}": ""`;
    if (i !== fields.length - 1) obj += ",";
    obj += "\n";
  });

  obj += "}";

  return obj;
}

function main() {
  let routeFiles = [];

  for (const dir of API_DIRS) {
    routeFiles = routeFiles.concat(walk(dir));
  }

  if (!routeFiles.length) {
    console.log("❌ No API routes found");
    return;
  }

  const docs = [];

  let md = "# API DOCUMENTATION\n\n";

  console.log("\n=== API DOCUMENTATION ===\n");

  for (const file of routeFiles) {
    const content = fs.readFileSync(file, "utf8");

    const endpoint = getEndpoint(file);
    const methods = getMethods(content);
    const body = getBodyFields(content);
    const query = getQueryFields(content);
    const res = detectResponse(content);

    for (const method of methods) {
      const doc = {
        endpoint,
        method,
        body,
        query,
        success: res.success,
        error: res.error,
        status: res.status,
      };

      docs.push(doc);

      // ======================
      // CONSOLE OUTPUT
      // ======================
      console.log(`${method} ${endpoint}`);
      console.log(`Body:\n${formatBody(body)}`);
      console.log("Errors:", res.error.length ? res.error : "-");
      console.log("Status:", res.status.length ? res.status : "-");
      console.log("");

      // ======================
      // MARKDOWN OUTPUT
      // ======================
      md += `## ${method} ${endpoint}\n\n`;

      md += `### Body Request\n`;
      md += body.length
        ? body.map((b) => `- ${b}`).join("\n")
        : "- None";
      md += "\n\n";

      md += `### Query Params\n`;
      md += query.length
        ? query.map((q) => `- ${q}`).join("\n")
        : "- None";
      md += "\n\n";

      md += `### Response Success\n`;
      md += res.success.length
        ? res.success.map((s) => `- ${s}`).join("\n")
        : "- success response available";
      md += "\n\n";

      md += `### Response Error\n`;
      md += res.error.length
        ? res.error.map((e) => `- ${e}`).join("\n")
        : "- error response available";
      md += "\n\n";

      md += `### Status Code\n`;
      md += res.status.length
        ? res.status.map((s) => `- ${s}`).join("\n")
        : "- 200";
      md += "\n\n---\n\n";
    }
  }

  // ======================
  // SAVE FILES
  // ======================
  fs.writeFileSync(
    "api-docs.json",
    JSON.stringify(docs, null, 2)
  );

  fs.writeFileSync("API.md", md);

  console.log("✅ DONE!");
  console.log("📄 API.md generated");
  console.log("📄 api-docs.json generated");
}

main();