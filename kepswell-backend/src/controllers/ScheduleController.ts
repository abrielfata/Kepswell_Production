import { Request, Response, NextFunction } from 'express';
import { ScheduleService } from '../services/ScheduleService';
import { formatDateToYYYYMMDD } from '../config/scheduleConstants';

export class ScheduleController {
  private scheduleService = new ScheduleService();

  handleGetSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { week } = req.query; // format YYYY-MM-DD
      
      // Default to this week's Monday if not provided
      let weekStartDate = week as string;
      if (!weekStartDate) {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        d.setDate(diff);
        weekStartDate = formatDateToYYYYMMDD(d);
      }

      const schedule = await this.scheduleService.retrieveWeekSchedule(weekStartDate);
      return res.status(200).json({ success: true, data: schedule });
    } catch (err) {
      next(err);
    }
  };

  handleSaveSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { weekStartDate, entries } = req.body;
      if (!weekStartDate || !Array.isArray(entries)) {
        return res.status(400).json({ success: false, message: 'Invalid payload' });
      }

      await this.scheduleService.processAndSaveSchedule(weekStartDate, entries);
      return res.status(200).json({ success: true, message: 'Schedule saved successfully' });
    } catch (err) {
      next(err);
    }
  };
}
