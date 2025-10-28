import prisma from "@/lib/db";
import { createTRPCRouter, protechedRoute } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { z } from "zod"; // REMOVE revalidatePath import

// Define your template enum as a constant to reuse
const TEMPLATES = ["REACT", "NEXTJS", "EXPRESS", "HONO", "ANGULAR", "VUE"] as const;

export const playGroundRouter = createTRPCRouter({
  // Create a new Playground
  createPlayground: protechedRoute.input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        template: z.enum(TEMPLATES).default("REACT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await prisma.playground.create({
          data: {
            title: input.title,
            describtion: input.description,
            template: input.template,
            userId: ctx.auth.userId,
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create playground",
        });
      }
    }),

  // Get all playgrounds for the logged-in user with starred status
  getAllPlaygrounds: protechedRoute.query(async ({ ctx }) => {
    try {
      const playgrounds = await prisma.playground.findMany({
        where: { userId: ctx.auth.userId },
        include: {
          startMark: {
            where: { userId: ctx.auth.userId },
            select: { isMarked: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return playgrounds.map(playground => ({
        ...playground,
        isStarred: playground.startMark[0]?.isMarked ?? false,
      }));
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch playgrounds",
      });
    }
  }),

  // Additional useful procedures
  toggleStar: protechedRoute
    .input(z.object({ playgroundId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const existingMark = await prisma.startMark.findUnique({
          where: {
            userId_playgroundId: {
              userId: ctx.auth.userId,
              playgroundId: input.playgroundId,
            },
          },
        });

        if (existingMark) {
          return await prisma.startMark.update({
            where: { id: existingMark.id },
            data: { isMarked: !existingMark.isMarked },
          });
        }

        return await prisma.startMark.create({
          data: {
            userId: ctx.auth.userId,
            playgroundId: input.playgroundId,
            isMarked: true,
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to toggle star",
        });
      }
    }),

  // Get a single playground by ID
  getPlayground: protechedRoute
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const playground = await prisma.playground.findUnique({
        where: {
          id: input.id,
          userId: ctx.auth.userId,
        },
        select: {
          id: true,
          title: true,
          describtion: true,
          template: true,
          createdAt: true,
          updatedAt: true,
          startMark: {
            where: { userId: ctx.auth.userId },
            select: { isMarked: true },
          },
          templateFiles: {
            select: { content: true },
          },
        },
      });

      if (!playground) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playground not found or access denied",
        });
      }

      return playground;
    }),

  // REMOVE these procedures since they're now in server actions:
  // deleteProjectById
  // editProjectById  
  // duplicateProjectById
  // saveCode
});