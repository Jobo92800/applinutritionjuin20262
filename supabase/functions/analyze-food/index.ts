import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Tu es un expert en nutrition. Analyse cette photo d'aliment(s) ou de repas.

Pour chaque aliment visible sur la photo, estime :
- Le nom de l'aliment en francais
- La quantite estimee (en grammes ou en unite)
- Les calories (kcal)
- Les proteines (g)
- Les glucides (g)
- Les lipides (g)
- Les fibres (g)

Reponds UNIQUEMENT avec un JSON valide, sans texte avant ou apres, dans ce format exact :
{
  "foods": [
    {
      "name": "Nom de l'aliment",
      "quantity": "150g",
      "calories": 250,
      "protein": 12.5,
      "carbs": 30.0,
      "fat": 8.5,
      "fiber": 3.0
    }
  ],
  "mealDescription": "Description courte du repas en francais",
  "healthScore": 7,
  "tips": "Un conseil nutritionnel court en francais lie a ce repas"
}

Le healthScore est une note de 1 a 10 sur la qualite nutritionnelle du repas.
Si tu ne peux pas identifier les aliments, reponds avec :
{"foods": [], "mealDescription": "Impossible d'identifier les aliments", "healthScore": 0, "tips": ""}`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: {
              url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
              detail: "low",
            }},
          ],
        }],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error("OpenAI API error:", errorData);
      return new Response(JSON.stringify({ error: "Failed to analyze image", details: errorData }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content || "";

    let analysisResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) { analysisResult = JSON.parse(jsonMatch[0]); }
      else { throw new Error("No JSON found in response"); }
    } catch {
      analysisResult = { foods: [], mealDescription: "Erreur lors de l'analyse", healthScore: 0, tips: "" };
    }

    const totalCalories = analysisResult.foods.reduce((sum: number, f: { calories: number }) => sum + (f.calories || 0), 0);
    const totalProtein = analysisResult.foods.reduce((sum: number, f: { protein: number }) => sum + (f.protein || 0), 0);
    const totalCarbs = analysisResult.foods.reduce((sum: number, f: { carbs: number }) => sum + (f.carbs || 0), 0);
    const totalFat = analysisResult.foods.reduce((sum: number, f: { fat: number }) => sum + (f.fat || 0), 0);

    return new Response(JSON.stringify({
      ...analysisResult,
      totalCalories,
      totalProtein: Math.round(totalProtein * 10) / 10,
      totalCarbs: Math.round(totalCarbs * 10) / 10,
      totalFat: Math.round(totalFat * 10) / 10,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
