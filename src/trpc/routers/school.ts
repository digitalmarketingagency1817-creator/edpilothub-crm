import { z } from "zod/v4";
import { createTRPCRouter, protectedProcedure } from "../init";
import { SchoolType, TechDetectionStatus, PipelineStage } from "@/generated/prisma";

export const schoolRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(5000).default(50),
        page: z.number().min(1).default(1),
        search: z.string().optional(),
        schoolType: z.nativeEnum(SchoolType).optional(),
        pipelineStage: z.nativeEnum(PipelineStage).optional(),
        techDetected: z.boolean().optional(),
        county: z.string().optional(),
        state: z.string().optional(),
        assignedToId: z.string().optional(),
        myCards: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        limit,
        page,
        search,
        schoolType,
        pipelineStage,
        techDetected,
        county,
        state,
        assignedToId,
        myCards,
      } = input;
      const skip = (page - 1) * limit;

      // Determine effective assignedToId filter
      const effectiveAssignedToId = myCards ? ctx.userId : assignedToId;

      const where = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
            { county: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(schoolType && { schoolType }),
        ...(county && { county: { contains: county, mode: "insensitive" as const } }),
        ...(state && { state: { equals: state, mode: "insensitive" as const } }),
        ...(techDetected !== undefined && {
          techDetectionStatus: techDetected
            ? TechDetectionStatus.DETECTED
            : TechDetectionStatus.PENDING,
        }),
        ...(pipelineStage && {
          pipelineStatus: { stage: pipelineStage },
        }),
        ...(effectiveAssignedToId && {
          pipelineStatus: {
            ...(pipelineStage ? { stage: pipelineStage } : {}),
            assignedToId: effectiveAssignedToId,
          },
        }),
      };

      const [schools, total] = await Promise.all([
        ctx.db.school.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: "asc" },
          include: {
            district: { select: { id: true, name: true } },
            pipelineStatus: {
              select: {
                stage: true,
                lastContactedAt: true,
                nextFollowUpAt: true,
                assignedToId: true,
              },
            },
          },
        }),
        ctx.db.school.count({ where }),
      ]);

      return {
        schools,
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.school.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        district: true,
        contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
        pipelineStatus: true,
        outreachLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            contact: { select: { id: true, name: true } },
          },
        },
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        ncesId: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        county: z.string().optional(),
        state: z.string().default("FL"),
        zipCode: z.string().optional(),
        phone: z.string().optional(),
        email: z.email().optional(),
        website: z.url().optional(),
        schoolType: z.nativeEnum(SchoolType).default(SchoolType.PUBLIC),
        gradeRange: z.string().optional(),
        studentCount: z.number().optional(),
        teacherCount: z.number().optional(),
        districtId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ctx.db.school.create({ data: input as any });
    }),

  updateTechStack: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        techStack: z.string(),
        status: z.nativeEnum(TechDetectionStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.school.update({
        where: { id: input.id },
        data: {
          techStack: input.techStack,
          techDetectionStatus: input.status,
          techDetectedAt: new Date(),
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        website: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.school.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only admins can delete schools
      const user = await ctx.db.user.findUniqueOrThrow({ where: { id: ctx.userId } });
      if (user.role !== "ADMIN") {
        throw new Error("Only admins can delete schools");
      }
      return ctx.db.school.delete({ where: { id: input.id } });
    }),
});
