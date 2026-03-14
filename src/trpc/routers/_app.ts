import { createTRPCRouter } from "../init";
import { schoolRouter } from "./school";
import { districtRouter } from "./district";
import { contactRouter } from "./contact";
import { rfpRouter } from "./rfp";
import { proposalRouter } from "./proposal";
import { outreachRouter } from "./outreach";
import { pipelineRouter } from "./pipeline";
import { noteRouter } from "./note";
import { opportunityRouter } from "./opportunity";
import { userRouter } from "./user";
import { scanRouter } from "./scan";

export const appRouter = createTRPCRouter({
  school: schoolRouter,
  district: districtRouter,
  contact: contactRouter,
  rfp: rfpRouter,
  proposal: proposalRouter,
  outreach: outreachRouter,
  pipeline: pipelineRouter,
  note: noteRouter,
  opportunity: opportunityRouter,
  user: userRouter,
  scan: scanRouter,
});

export type AppRouter = typeof appRouter;
