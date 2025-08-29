import OpenAI from "openai";

interface CallGPTParams {
  system: string;
  user: any;
  schema?: Record<string, unknown>;
  temperature?: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function callGPT({
  system,
  user,
  schema,
  temperature = 0
}: CallGPTParams): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required but not set");
  }

  const response_format = schema 
    ? { 
        type: "json_schema" as const, 
        json_schema: { 
          name: "UltaAI_JSON", 
          schema, 
          strict: true 
        } 
      }
    : { type: "json_object" as const };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4000,
    response_format,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content received from OpenAI");
  }

  return JSON.parse(content);
}