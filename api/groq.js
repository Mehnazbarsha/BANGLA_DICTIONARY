export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const apiKey = req.headers["x-groq-key"];
  if (!apiKey) return res.status(401).json({ error: "No API key" });

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(req.body),
  });

  const data = await response.json();
  res.status(response.status).json(data);
}