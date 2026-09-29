function requireApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY não configurada. Adicione a chave nas variáveis de ambiente do projeto.",
    );
  }
  return apiKey;
}

async function extractImageBuffer(response: Response) {
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

export async function generateImagePng(prompt: string): Promise<Buffer> {
  const apiKey = requireApiKey();

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

  return extractImageBuffer(response);
}

export async function generateImageFromReferencePng(
  prompt: string,
  referenceImage: { buffer: Buffer; mimeType: string },
): Promise<Buffer> {
  const apiKey = requireApiKey();

  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", prompt);
  form.append("size", "1024x1024");
  form.append("quality", "medium");
  form.append(
    "image",
    new Blob([Uint8Array.from(referenceImage.buffer)], {
      type: referenceImage.mimeType,
    }),
    "reference.png",
  );

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  return extractImageBuffer(response);
}
