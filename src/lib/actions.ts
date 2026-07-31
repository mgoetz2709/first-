"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { runProcessAnalysis } from "@/lib/analysis";
import type { RecommendationStatus } from "@/lib/types";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function optStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v.length ? v : null;
}

export async function createClient(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name ist erforderlich.");

  const client = await prisma.client.create({
    data: {
      name,
      industry: optStr(formData, "industry"),
      aiStrategy: str(formData, "aiStrategy"),
    },
  });

  revalidatePath("/");
  redirect(`/clients/${client.id}`);
}

export async function updateClientStrategy(formData: FormData) {
  const id = str(formData, "id");
  await prisma.client.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      industry: optStr(formData, "industry"),
      aiStrategy: str(formData, "aiStrategy"),
    },
  });
  revalidatePath(`/clients/${id}`);
}

export async function deleteClient(formData: FormData) {
  const id = str(formData, "id");
  await prisma.client.delete({ where: { id } });
  revalidatePath("/");
  redirect("/");
}

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

export async function createStep(formData: FormData) {
  const processId = str(formData, "processId");
  const name = str(formData, "name");
  if (!name) throw new Error("Name ist erforderlich.");

  const count = await prisma.processStep.count({ where: { processId } });

  await prisma.processStep.create({
    data: {
      processId,
      order: count + 1,
      name,
      description: optStr(formData, "description"),
      roleResponsible: optStr(formData, "roleResponsible"),
      systemsUsed: optStr(formData, "systemsUsed"),
    },
  });

  revalidatePath(`/processes/${processId}`);
}

export async function deleteStep(formData: FormData) {
  const id = str(formData, "id");
  const processId = str(formData, "processId");
  await prisma.processStep.delete({ where: { id } });
  revalidatePath(`/processes/${processId}`);
}

export async function createInterview(formData: FormData) {
  const processId = str(formData, "processId");
  const participantName = str(formData, "participantName");
  const transcript = str(formData, "transcript");
  if (!participantName || !transcript) {
    throw new Error("Teilnehmer und Transkript sind erforderlich.");
  }
  const dateStr = str(formData, "date");

  await prisma.interview.create({
    data: {
      processId,
      participantName,
      participantRole: optStr(formData, "participantRole"),
      date: dateStr ? new Date(dateStr) : null,
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
    data: {
      processId,
      filename,
      mimeType: file?.type ?? "text/plain",
      content,
    },
  });

  revalidatePath(`/processes/${processId}`);
}

export async function deleteDocument(formData: FormData) {
  const id = str(formData, "id");
  const processId = str(formData, "processId");
  await prisma.documentAsset.delete({ where: { id } });
  revalidatePath(`/processes/${processId}`);
}

export async function runAnalysisAction(formData: FormData) {
  const processId = str(formData, "processId");
  const runId = await runProcessAnalysis(processId);
  revalidatePath(`/processes/${processId}`);
  redirect(`/processes/${processId}/analysis/${runId}`);
}

export async function updateRecommendationStatus(formData: FormData) {
  const id = str(formData, "id");
  const processId = str(formData, "processId");
  const status = str(formData, "status") as RecommendationStatus;
  await prisma.recommendation.update({ where: { id }, data: { status } });
  revalidatePath(`/processes/${processId}`);
}

export async function updateRecommendationArtifact(formData: FormData) {
  const id = str(formData, "id");
  const processId = str(formData, "processId");
  await prisma.recommendation.update({
    where: { id },
    data: {
      artifact: str(formData, "artifact"),
      artifactTitle: optStr(formData, "artifactTitle"),
    },
  });
  revalidatePath(`/processes/${processId}`);
}
