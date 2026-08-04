"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  generateInterviewGuide,
  structureInterview,
  generateDocumentation,
  analyzePainPoints,
  runValidation,
  submitCorrectionRound,
  designSolutionConcepts,
  generateArtifact,
  generateFinalReport,
} from "@/lib/analysis";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function optStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v.length ? v : null;
}

// --- Client -----------------------------------------------------------

export async function createClient(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name ist erforderlich.");

  const client = await prisma.client.create({
    data: { name, industry: optStr(formData, "industry"), aiStrategy: str(formData, "aiStrategy") },
  });

  revalidatePath("/");
  redirect(`/clients/${client.id}`);
}

export async function updateClientStrategy(formData: FormData) {
  const id = str(formData, "id");
  await prisma.client.update({
    where: { id },
    data: { name: str(formData, "name"), industry: optStr(formData, "industry"), aiStrategy: str(formData, "aiStrategy") },
  });
  revalidatePath(`/clients/${id}`);
}

export async function deleteClient(formData: FormData) {
  const id = str(formData, "id");
  await prisma.client.delete({ where: { id } });
  revalidatePath("/");
  redirect("/");
}

// --- Process ------------------------------------------------------------

export async function createProcess(formData: FormData) {
  const clientId = str(formData, "clientId");
  const name = str(formData, "name");
  if (!name) throw new Error("Name ist erforderlich.");

  const proc = await prisma.process.create({
    data: {
      clientId,
      name,
      description: optStr(formData, "description"),
      owner: optStr(formData, "owner"),
      goal: optStr(formData, "goal"),
    },
  });

  revalidatePath(`/clients/${clientId}`);
  redirect(`/processes/${proc.id}`);
}

export async function deleteProcess(formData: FormData) {
  const id = str(formData, "id");
  const clientId = str(formData, "clientId");
  await prisma.process.delete({ where: { id } });
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

// --- Documents (supplementary only) -------------------------------------

export async function createDocument(formData: FormData) {
  const processId = str(formData, "processId");
  const file = formData.get("file") as File | null;
  const pastedContent = str(formData, "content");
  const manualFilename = optStr(formData, "filename");

  let filename = manualFilename ?? "Eingefügter Text";
  let content = pastedContent;

  if (file && file.size > 0) {
    filename = file.name;
    content = await file.text();
  }

  if (!content) throw new Error("Bitte Datei hochladen oder Text einfügen.");

  await prisma.documentAsset.create({
    data: { processId, filename, mimeType: file?.type ?? "text/plain", content },
  });

  revalidatePath(`/processes/${processId}`);
}

export async function deleteDocument(formData: FormData) {
  const id = str(formData, "id");
  const processId = str(formData, "processId");
  await prisma.documentAsset.delete({ where: { id } });
  revalidatePath(`/processes/${processId}`);
}

// --- Stage 0: Interview guide ------------------------------------------

export async function generateInterviewGuideAction(formData: FormData) {
  const processId = str(formData, "processId");
  await generateInterviewGuide(processId);
  revalidatePath(`/processes/${processId}`);
  revalidatePath(`/processes/${processId}/guide`);
}

// --- Stage 1: Interviews ------------------------------------------

export async function createInterview(formData: FormData) {
  const processId = str(formData, "processId");
  const participantName = str(formData, "participantName");
  const transcript = str(formData, "transcript");
  if (!participantName || !transcript) throw new Error("Teilnehmer und Transkript sind erforderlich.");

  await prisma.interview.create({
    data: {
      processId,
      participantName,
      participantRole: optStr(formData, "participantRole"),
      mode: optStr(formData, "mode") ?? "transcript_analysis",
      transcript,
    },
  });

  revalidatePath(`/processes/${processId}`);
}

export async function deleteInterview(formData: FormData) {
  const id = str(formData, "id");
  const processId = str(formData, "processId");
  await prisma.interview.delete({ where: { id } });
  revalidatePath(`/processes/${processId}`);
}

export async function structureInterviewAction(formData: FormData) {
  const id = str(formData, "id");
  const processId = str(formData, "processId");
  await structureInterview(id);
  revalidatePath(`/processes/${processId}`);
}

// --- Stage 2: Documentation ---------------------------------------

export async function generateDocumentationAction(formData: FormData) {
  const processId = str(formData, "processId");
  await generateDocumentation(processId);
  revalidatePath(`/processes/${processId}`);
}

// --- Stage 3: Pain Points ------------------------------------------

export async function analyzePainPointsAction(formData: FormData) {
  const processId = str(formData, "processId");
  await analyzePainPoints(processId);
  revalidatePath(`/processes/${processId}`);
}

// --- Stage 4: Validation + correction loop -----------------------

export async function runValidationAction(formData: FormData) {
  const processId = str(formData, "processId");
  await runValidation(processId);
  revalidatePath(`/processes/${processId}`);
}

export async function answerStakeholderQuestion(formData: FormData) {
  const id = str(formData, "id");
  const processId = str(formData, "processId");
  await prisma.stakeholderQuestion.update({
    where: { id },
    data: { answer: str(formData, "answer"), answeredAt: new Date() },
  });
  revalidatePath(`/processes/${processId}`);
}

export async function submitCorrectionRoundAction(formData: FormData) {
  const processId = str(formData, "processId");
  await submitCorrectionRound(processId);
  revalidatePath(`/processes/${processId}`);
}

// --- Stage 5: Solution Design + prioritization ----------------------

export async function designSolutionConceptsAction(formData: FormData) {
  const processId = str(formData, "processId");
  await designSolutionConcepts(processId);
  revalidatePath(`/processes/${processId}`);
}

export async function toggleConceptPriority(formData: FormData) {
  const id = str(formData, "id");
  const processId = str(formData, "processId");
  const isPriority = str(formData, "isPriority") === "true";
  await prisma.solutionConcept.update({ where: { id }, data: { isPriority } });
  revalidatePath(`/processes/${processId}`);
}

// --- Stage 6: Artifact generation -----------------------------------------

export async function generateArtifactAction(formData: FormData) {
  const id = str(formData, "id");
  const processId = str(formData, "processId");
  await generateArtifact(id);
  revalidatePath(`/processes/${processId}`);
}

// --- Stage 7: Final report -------------------------------------------

export async function generateFinalReportAction(formData: FormData) {
  const processId = str(formData, "processId");
  await generateFinalReport(processId);
  revalidatePath(`/processes/${processId}`);
}
