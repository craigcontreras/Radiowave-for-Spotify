import fs from "fs";

export async function GET() {
    try {
        const data = fs.readFileSync("sitemap.xml", "utf8");
        return {
            Headers: {
                "Content-Type": "application/xml"
            },
            body: data
        }
    } catch (err) {
        return {
            body: "Error"
        }
    }
}