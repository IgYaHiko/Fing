"use server";

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';

// Define the template enum to match your Prisma schema
const TEMPLATES = ["REACT", "NEXTJS", "EXPRESS", "HONO", "ANGULAR", "VUE"] as const;
type Template = typeof TEMPLATES[number];

// Helper function to validate template
function isValidTemplate(template: string): template is Template {
  return TEMPLATES.includes(template as Template);
}

export async function deleteProjectById(id: string) {
  const session = await auth();
  const userId = session.userId;

  if (!userId) {
    throw new Error("Not authenticated");
  }

  const project = await prisma.playground.findUnique({
    where: { id },
  });

  if (!project || project.userId !== userId) {
    throw new Error("Project not found or no permission");
  }

  await prisma.playground.delete({
    where: { id },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function editProjectById(
  id: string, 
  updates: { 
    title?: string; 
    describtion?: string | null; 
    template?: string // Accept string input
  }
) {
  const session = await auth();
  const userId = session.userId;

  if (!userId) {
    throw new Error("Not authenticated");
  }

  const project = await prisma.playground.findUnique({
    where: { id, userId },
  });

  if (!project) {
    throw new Error("Project not found or access denied");
  }

  // Create the update data with proper typing
  const dataToUpdate: any = {};
  if (updates.title !== undefined) dataToUpdate.title = updates.title;
  if (updates.describtion !== undefined) dataToUpdate.describtion = updates.describtion;
  
  // Validate and set template
  if (updates.template !== undefined) {
    if (isValidTemplate(updates.template)) {
      dataToUpdate.template = updates.template;
    } else {
      throw new Error(`Invalid template: ${updates.template}`);
    }
  }

  const updatedProject = await prisma.playground.update({
    where: { id },
    data: dataToUpdate,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/playground/${id}`);
  return updatedProject;
}

export async function duplicateProjectById(id: string) {
  const session = await auth();
  const userId = session.userId;

  if (!userId) {
    throw new Error("Not authenticated");
  }

  const project = await prisma.playground.findUnique({
    where: { id },
  });

  if (!project || project.userId !== userId) {
    throw new Error("Project not found or no permission");
  }

  const duplicatedProject = await prisma.playground.create({
    data: {
      title: `${project.title} (Copy)`,
      describtion: project.describtion,
      template: project.template, // This should already be the correct type from Prisma
      userId,
    },
  });

  revalidatePath("/dashboard");
  return duplicatedProject;
}

export async function saveCode(playgroundId: string, data: string) {
  const session = await auth();
  const userId = session.userId;

  if (!userId) {
    throw new Error("Not authenticated");
  }

  const playground = await prisma.playground.findUnique({
    where: {
      id: playgroundId,
      userId
    }
  });

  if (!playground) {
    throw new Error("Playground not found or access denied");
  }

  const existingFile = await prisma.templateFile.findFirst({
    where: {
      playgroundId
    }
  });

  let result;
  if (existingFile) {
    result = await prisma.templateFile.update({
      where: { id: existingFile.id },
      data: { 
        content: data,
        updatedAt: new Date() 
      }
    });
  } else {
    result = await prisma.templateFile.create({
      data: {
        playgroundId,
        content: data
      }
    });
  }

  revalidatePath(`/playground/${playgroundId}`);
  revalidatePath("/dashboard");
  return result;
}