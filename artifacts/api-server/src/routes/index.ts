import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import machinesRouter from "./machines";
import quotesRouter from "./quotes";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";
import storageRouter from "./storage";
import aiRouter from "./ai";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(customersRouter);
router.use(machinesRouter);
router.use(quotesRouter);
router.use(settingsRouter);
router.use(storageRouter);
router.use(aiRouter);
router.use(feedbackRouter);

export default router;
