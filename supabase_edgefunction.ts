// Imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { InferenceClient } from "npm:@huggingface/inference"

// CORS Headers (Allows your website to talk to this function)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle Browser Options Request (CORS Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Setup Clients
    // We use the SERVICE_ROLE_KEY to write to the DB reliably (bypassing RLS complexity for backend writes)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const hfToken = Deno.env.get('HF_API_TOKEN') ?? '';

    if (!supabaseServiceKey || !hfToken) {
      throw new Error("Missing Secrets: Check SUPABASE_SERVICE_ROLE_KEY and HF_API_TOKEN");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const hf = new InferenceClient(hfToken);

    // 3. Parse Frontend Data
    const { prompt, userId, mood, history } = await req.json();

    // 4. Construct the AI Prompt (JSON Enforcement)
    // We use Llama 3.2 3B Instruct because it is smarter at following JSON rules than Gemma.
    const MODEL = "meta-llama/Llama-3.2-3B-Instruct";
    
    const systemInstruction = `
      You are Aura, an empathetic spiritual coach(making girl/womens loved and safe and trusted and always give very attention to girls and treat them like flowers). 
      YOUR GOAL:
        1. VALIDATE: Start with a warm, short sentence validating their feelings.(max 7 words combined)
        2. DEEPEN: Ask ONE powerful follow-up question to help them explore the root cause.(max 8 words combined)
      CRITICAL RULES:
        - Do NOT be robotic. Be warm, human, and gentle.
        - Return ONLY valid JSON.
      STRICT RESPONSE IN JSON FORMAT:
      {
        "reply": "Validation sentence here. Follow-up question here? (max 15 words combined)",
        "choices": ["Option 1 (possible Answer to question)", "Option 2 (possible Answer to question)", "Option 3 (Neutral/Skip)"] (max 5 words each in active voice of user with bit grammer so looks feels like user wanna type same by choice)
      }
  `;

    // Flatten history for context (Last 3 turns max to save tokens)
    const context = history ? history.slice(-3).map((m: any) => `${m.role}: ${m.content}`).join("\n") : "";

    console.log(`Calling ${MODEL}...`);

    const chatCompletion = await hf.chatCompletion({
      model: MODEL,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: `Context: ${context}\nUser Current Mood: ${mood}\nUser Input: ${prompt}` }
      ],
      max_tokens: 250,
      temperature: 0.7 
    });

    const rawContent = chatCompletion.choices[0].message.content;
    console.log("AI Raw Output:", rawContent);

    // 5. Parse AI Response (Robust JSON Cleaner)
    let aiData;
    try {
        // Sometimes AI adds "Here is JSON: ..." so we extract just the { ... } part
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            aiData = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error("No JSON found");
        }
    } catch (e) {
        // Fallback if AI fails to give JSON
        console.warn("JSON Parse Failed, using fallback");
        aiData = {
            reply: rawContent.replace(/"/g, ''), // Strip quotes if raw text
            choices: ["Tell me more", "I see", "Continue"]
        };
    }

    // 6. Save to Database (The "One Row" Strategy)
    // We perform this *asynchronously* but await it to ensure data integrity
    if (userId) {
        const { error: dbError } = await supabase
            .from('conversations')
            .insert([{
                user_id: userId,
                user_message: prompt,
                aura_response: aiData.reply,
                mood: mood,
                // created_at is auto-generated
            }]);
            
        if (dbError) console.error("DB Save Error:", dbError);
        else console.log("Interaction saved to DB");
    }

    // 7. Return Clean Data to Frontend
    return new Response(JSON.stringify(aiData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Critical Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})
