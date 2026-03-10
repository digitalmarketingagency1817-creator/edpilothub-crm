import { createTRPCRouter } from "../init";
import { schoolRouter } from "./school";
import { districtRouter } from "./district";
import { contactRouter } from "./contact";
import { rfpRouter } from "./rfp";
import { proposalRouter } from "./proposal";
import { outreachRouter } from "./outreach";
import { pipelineRouter } from "./pipeline";

export const appRouter = createTRPCRouter({
  school: schoolRouter,
  district: districtRouter,
  contact: contactRouter,
  rfp: rfpRouter,
  proposal: proposalRouter,
  outreach: outreachRouter,
  pipeline: pipelineRouter,
});

export type AppRouter = typeof appRouter;
