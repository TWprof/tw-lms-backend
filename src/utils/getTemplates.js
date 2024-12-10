import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function getTemplate(fileName, placeholders) {
  const filePath = path.join(__dirname, "templates", fileName);
  let template = fs.readFileSync(filePath, "utf8");

  for (const key in placeholders) {
    const regex = new RegExp(`{{${key}}}`, "g");
    template = template.replace(regex, placeholders[key]);
  }

  const baseUrl = process.env.BASE_URL;
  template = template.replace(/{{BASE_URL}}/g, baseUrl);

  return template;
}
