import prisma from '../config/database';
import { mailerService } from './mailer.service';

// The critical incident parameters the vendor QA review specifically called
// out for real-time alerting, matched to their DB field names and display
// labels.
const CRITICAL_INCIDENT_FIELDS: { field: string; label: string }[] = [
  { field: 'lostTimeInjuryActual', label: 'Lost Time Injury' },
  { field: 'recordableIncidentsActual', label: 'Recordable Incidents' },
  { field: 'medicalTreatmentInjuryActual', label: 'Medical Treatment Injury' },
  { field: 'firstAidInjuryActual', label: 'First Aid Injury' },
  { field: 'spillsIncidentsActual', label: 'Spills Incidents' },
  { field: 'environmentalIncidentsActual', label: 'Environmental Incidents' },
];

export class AlertService {
  private async getCompanyAdminEmails(companyId: string): Promise<string[]> {
    const admins = await prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        role: { in: ['SUPER_ADMIN', 'ADMIN'] },
      },
      select: { email: true },
    });
    return admins.map((a) => a.email);
  }

  /**
   * Compares a saved SafetyMetrics record against what it looked like before
   * the save (null if this is a new record) and alerts company admins for
   * any critical incident parameter that's newly non-zero or increased.
   * Deliberately does NOT re-alert when an unrelated field changes and the
   * incident count stays exactly the same as before.
   */
  async notifyIfCriticalIncident(
    companyId: string,
    siteName: string,
    month: string,
    year: number,
    newRecord: Record<string, any>,
    oldRecord: Record<string, any> | null
  ): Promise<void> {
    const triggered = CRITICAL_INCIDENT_FIELDS.filter(({ field }) => {
      const newVal = Number(newRecord[field]) || 0;
      const oldVal = oldRecord ? Number(oldRecord[field]) || 0 : 0;
      return newVal > 0 && newVal !== oldVal;
    }).map(({ field, label }) => ({ label, actual: Number(newRecord[field]) || 0 }));

    if (triggered.length === 0) {
      return;
    }

    const emails = await this.getCompanyAdminEmails(companyId);
    if (emails.length === 0) {
      return;
    }

    await mailerService.sendCriticalIncidentAlert(emails, {
      siteName,
      month,
      year,
      incidents: triggered,
    });
  }

  async notifyIfHighPriorityCapa(companyId: string, capa: {
    title: string;
    priority: string;
    dueDate: Date | null;
    site?: { siteName: string } | null;
  }): Promise<void> {
    if (capa.priority !== 'HIGH' && capa.priority !== 'CRITICAL') {
      return;
    }

    const emails = await this.getCompanyAdminEmails(companyId);
    if (emails.length === 0) {
      return;
    }

    await mailerService.sendCapaPriorityAlert(emails, {
      title: capa.title,
      priority: capa.priority,
      siteName: capa.site?.siteName,
      dueDate: capa.dueDate ? capa.dueDate.toISOString() : null,
    });
  }

  /**
   * Daily digest of every open/in-progress corrective action past its due
   * date, grouped and sent per company. Intentionally sends every day an
   * item remains overdue rather than a single one-off notice - there's no
   * dedup/suppression tracking yet, so this will repeat until the CAPA is
   * closed or its due date is pushed out.
   *
   * Never throws - this runs off a bare setInterval with nothing else
   * catching it, so a failure here (e.g. a transient DB outage) would
   * otherwise be an unhandled rejection that crashes the whole server.
   */
  async runOverdueCapaDigest(): Promise<void> {
    try {
      const overdue = await prisma.correctiveAction.findMany({
        where: {
          status: { not: 'CLOSED' },
          dueDate: { lt: new Date() },
        },
        include: {
          site: { select: { siteName: true } },
        },
      });

      if (overdue.length === 0) {
        return;
      }

      const byCompany = new Map<string, typeof overdue>();
      for (const capa of overdue) {
        const list = byCompany.get(capa.companyId) || [];
        list.push(capa);
        byCompany.set(capa.companyId, list);
      }

      for (const [companyId, items] of byCompany) {
        const emails = await this.getCompanyAdminEmails(companyId);
        if (emails.length === 0) continue;

        await mailerService.sendCapaOverdueDigest(
          emails,
          items.map((i) => ({
            title: i.title,
            siteName: i.site?.siteName,
            dueDate: i.dueDate!.toISOString(),
            priority: i.priority,
          }))
        );
      }
    } catch (err) {
      console.error('Overdue CAPA digest failed:', err);
    }
  }
}

export const alertService = new AlertService();
