export async function generateImagePng(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY não configurada. Adicione a chave nas variáveis de ambiente do projeto.",
    );
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "medium",
      n: 1,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao gerar imagem (${response.status}): ${body}`);
  }

  const json = await response.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("A API de imagem não retornou dados.");
  }

  return Buffer.from(b64, "base64");
}
