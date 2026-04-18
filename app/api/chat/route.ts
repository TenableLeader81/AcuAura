import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { waterSources } from "@/data/waterSources";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

    // Fetch reports from Supabase
    const { data: reports } = await supabase
      .from("reports")
      .select("type, municipality, address, description, status, votes, user_name, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    // Build context
    const reportSummary = buildReportSummary(reports ?? []);
    const sourcesSummary = buildSourcesSummary();

    const systemPrompt = `Eres AcuBot, el asistente inteligente de AcuAura — sistema de monitoreo hídrico de Querétaro, México.
Respondes preguntas sobre calidad del agua, pozos, presas y reportes comunitarios de la ciudad.
Sé breve, claro y usa datos concretos. Responde siempre en español.
Si no tienes datos para responder con certeza, dilo honestamente.

=== FUENTES DE AGUA MONITOREADAS ===
${sourcesSummary}

=== RESUMEN DE REPORTES COMUNITARIOS ===
${reportSummary}

=== TIPOS DE REPORTE ===
- sin_agua: Sin servicio de agua
- fuga: Fuga o desperdicio de agua
- contaminacion: Agua contaminada o con mal olor/sabor
- baja_presion: Poca presión en las tuberías
- otro: Otros problemas

Responde de forma conversacional y útil. Si preguntan por una colonia o municipio específico, filtra la información relevante.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: (history ?? []).map((m: { role: string; text: string }) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (err: any) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: "Error al procesar tu pregunta." }, { status: 500 });
  }
}

function buildSourcesSummary(): string {
  return waterSources.map((s) =>
    `• ${s.name} (${s.type}, ${s.municipality}) — Calidad: ${s.qualityLevel} (${s.quality.score}/100) | pH: ${s.quality.ph} | Turbidez: ${s.quality.turbidity} NTU | Nitratos: ${s.quality.nitrates} mg/L | ${s.active ? "Activo" : "Inactivo"}`
  ).join("\n");
}

function buildReportSummary(reports: any[]): string {
  if (reports.length === 0) return "No hay reportes registrados aún.";

  const byType = reports.reduce((acc: Record<string, number>, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  const byMunicipality = reports.reduce((acc: Record<string, number>, r) => {
    acc[r.municipality] = (acc[r.municipality] || 0) + 1;
    return acc;
  }, {});

  const active = reports.filter((r) => r.status === "activo").length;
  const resolved = reports.filter((r) => r.status === "resuelto").length;

  const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
  const topMuni = Object.entries(byMunicipality).sort((a, b) => b[1] - a[1])[0];

  const recent = reports.slice(0, 10).map((r) =>
    `  - ${r.type.replace("_", " ")} en ${r.municipality}${r.address ? " (" + r.address + ")" : ""}${r.description ? ': "' + r.description + '"' : ""} | Estado: ${r.status} | 👍 ${r.votes}`
  ).join("\n");

  return `Total: ${reports.length} reportes | Activos: ${active} | Resueltos: ${resolved}
Tipo más frecuente: ${topType?.[0]?.replace("_", " ")} (${topType?.[1]} reportes)
Zona con más reportes: ${topMuni?.[0]} (${topMuni?.[1]} reportes)

Por tipo: ${Object.entries(byType).map(([k, v]) => `${k.replace("_", " ")}: ${v}`).join(", ")}
Por municipio: ${Object.entries(byMunicipality).map(([k, v]) => `${k}: ${v}`).join(", ")}

Últimos 10 reportes:
${recent}`;
}
