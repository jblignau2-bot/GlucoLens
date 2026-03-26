import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Shared analysis prompt

const buildAnalysisPrompt = (country, diabetesType) => {
  return "Job a diabetes nutrition expert";
};

export { buildAnalysisPrompt };
