import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
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

    // Fetch all context in parallel
    const [
      { data: reports },
      { data: calidad },
      { data: pozos },
      { data: acuiferos },
    ] = await Promise.all([
      supabase.from("reports").select("type, municipality, address, description, status, votes, user_name, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("resumen_calidad_zona").select("*"),
      supabase.from("pozo").select("codigo, profundidad_m, caudal_lps, latitud, longitud, acuifero(nombre)"),
      supabase.from("acuifero").select("clave, nombre, superficie_km2"),
    ]);

    const systemPrompt = `Eres AcuBot, el asistente inteligente de AcuAura — sistema de monitoreo hídrico de Querétaro, México.
Respondes preguntas sobre calidad del agua, pozos, acuíferos, colonias y reportes comunitarios.
Sé breve, claro y usa datos concretos. Responde siempre en español.
Si no tienes datos suficientes, dilo honestamente.

=== ACUÍFEROS DE QUERÉTARO ===
${buildAcuiferosSummary(acuiferos ?? [])}

=== POZOS MONITOREADOS ===
${buildPozosSummary(pozos ?? [])}

=== CALIDAD DEL AGUA POR COLONIA ===
${buildCalidadSummary(calidad ?? [])}

=== REPORTES COMUNITARIOS ===
${buildReportSummary(reports ?? [])}

Responde de forma conversacional. Si preguntan por una colonia o zona específica, filtra la información relevante.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
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

function buildAcuiferosSummary(acuiferos: any[]): string {
  if (!acuiferos.length) return "Sin datos de acuíferos.";
  return acuiferos.map((a) =>
    `• ${a.nombre} (clave: ${a.clave}) — Superficie: ${a.superficie_km2 ?? "N/D"} km²`
  ).join("\n");
}

function buildPozosSummary(pozos: any[]): string {
  if (!pozos.length) return "Sin datos de pozos.";
  return pozos.map((p) =>
    `• Pozo ${p.codigo} — Acuífero: ${p.acuifero?.nombre ?? "N/D"} | Prof: ${p.profundidad_m}m | Caudal: ${p.caudal_lps} L/s`
  ).join("\n");
}

function buildCalidadSummary(calidad: any[]): string {
  if (!calidad.length) return "Sin datos de calidad del agua.";
  return calidad.map((c) =>
    `• ${c.zona} — ${c.clasificacion ?? "Sin clasificar"} | pH: ${c.ph ?? "N/D"} | Turbidez: ${c.turbiedad_ntu ?? "N/D"} NTU | Cloro: ${c.cloro_residual_libre_mg_l ?? "N/D"} mg/L | Coliformes: ${(c.coliformes_fecales_100ml ?? 0) + (c.coliformes_totales_100ml ?? 0)} | Fuente: ${c.fuente ?? "N/D"} (${c.tipo_fuente ?? ""}) | Fecha: ${c.ultima_fecha ?? "N/D"}`
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
