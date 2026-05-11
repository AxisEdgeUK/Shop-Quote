import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import machinesRouter from "./machines";
import quotesRouter from "./quotes";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(customersRouter);
router.use(machinesRouter);
router.use(quotesRouter);
router.use(settingsRouter);

export default router;
