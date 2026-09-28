import { Meeting, AttendanceRecord, Employee, Settings, WeeklyEmployeeRanking, MonthlyEmployeeRanking } from './types';
import { formatDateLong, formatTime12 } from './date-utils';

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: {
    type: string;
    text: string;
  }[];
  elements?: any[];
}

export interface SlackPayload {
  channel?: string;
  text: string;
  blocks: SlackBlock[];
}

/**
 * Generate 1-Click Daily Standup or EOD Report for Slack
 */
export function generateDailySlackReport(
  meeting: Meeting,
  records: AttendanceRecord[],
  employees: Employee[],
  settings: Settings
): { payload: SlackPayload; markdownText: string } {
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const isEod = meeting.type === 'eod';
  const meetingTitle = isEod ? '🌆 End of Day (EOD) Report' : '🏆 Daily Standup Report';
  const dateFormatted = formatDateLong(meeting.scheduledStart);
  const timeFormatted = formatTime12(meeting.scheduledStart);

  // Separate attendees into present (on-time & late) and absent/excused
  const presentRecords = records.filter((r) => r.status === 'present' || r.status === 'late');
  const absentRecords = records.filter((r) => r.status === 'absent');
  const excusedRecords = records.filter((r) => r.status === 'excused');

  // Sort present attendees:
  // 1. Daily score DESC
  // 2. JoinedAt ASC
  presentRecords.sort((a, b) => {
    if (b.dailyScore !== a.dailyScore) return b.dailyScore - a.dailyScore;
    const aTime = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
    const bTime = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
    return aTime - bTime;
  });

  const totalEmployees = employees.filter((e) => e.active).length;
  const onTimeCount = presentRecords.filter((r) => r.isOnTime).length;
  const lateCount = presentRecords.filter((r) => !r.isOnTime).length;
  const attendancePct = totalEmployees > 0 ? Math.round((presentRecords.length / totalEmployees) * 100) : 0;

  // Build Markdown Text
  let md = `*${meetingTitle} — ${dateFormatted}*\n`;
  md += `⏰ *Scheduled:* ${timeFormatted} | *Attendance:* ${presentRecords.length}/${totalEmployees} (${attendancePct}%)\n`;
  md += `✅ *On Time:* ${onTimeCount} | ⚠️ *Late:* ${lateCount} | ❌ *Absent:* ${absentRecords.length}\n\n`;

  md += `*📋 Attendance, Join Times & Points Breakdown:*\n`;
  presentRecords.forEach((rec, idx) => {
    const emp = empMap.get(rec.employeeId);
    const name = emp ? emp.name : 'Unknown';
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
    const joinTime = rec.joinedAt ? formatTime12(rec.joinedAt) : 'N/A';
    const statusText = rec.isOnTime ? 'On Time' : `${rec.minutesLate}m late`;
    const scoreSign = rec.dailyScore >= 0 ? `+${rec.dailyScore.toFixed(1)}` : `${rec.dailyScore.toFixed(1)}`;
    md += `${medal} *${name}* — ⏰ Joined: *${joinTime}* (\`${scoreSign} 🪙 WP\` • ${statusText})\n`;
  });

  if (absentRecords.length > 0) {
    md += `\n*❌ Absent (${absentRecords.length}):*\n`;
    absentRecords.forEach((rec) => {
      const emp = empMap.get(rec.employeeId);
      const name = emp ? emp.name : 'Unknown';
      const penalty = rec.dailyScore < 0 ? ` (\`${rec.dailyScore.toFixed(1)} 🪙 WP\` penalty • Did not join)` : ' (Did not join)';
      md += `• *${name}*${penalty}\n`;
    });
  }

  if (excusedRecords.length > 0) {
    md += `\n*🌴 Approved Leave (${excusedRecords.length}):*\n`;
    excusedRecords.forEach((rec) => {
      const emp = empMap.get(rec.employeeId);
      const name = emp ? emp.name : 'Unknown';
      md += `• *${name}* (Approved Leave • 0 🪙 WP)\n`;
    });
  }

  const warningMsg = settings.slackWarningMessageTemplate || 
    `⚠️ *Policy Notice:* Minus 🪙 WP coin balances equal payroll salary deductions (${settings.finePerMinusPoint} ${settings.salaryCurrency}/minus point). Please be punctual and join all mandatory meetings.`;
  md += `\n---\n${warningMsg}`;

  // Build Slack Block Kit
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${meetingTitle} • ${dateFormatted}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*⏰ Scheduled Time:*\n${timeFormatted}`,
        },
        {
          type: 'mrkdwn',
          text: `*📊 Attendance:*\n${presentRecords.length}/${totalEmployees} (${attendancePct}%)`,
        },
        {
          type: 'mrkdwn',
          text: `*✅ On-Time:* ${onTimeCount} | *⚠️ Late:* ${lateCount}`,
        },
        {
          type: 'mrkdwn',
          text: `*❌ Absent:* ${absentRecords.length}`,
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📋 Standup Standings & Join Timestamps:*\n` + presentRecords.slice(0, 15).map((rec, idx) => {
          const emp = empMap.get(rec.employeeId);
          const name = emp ? emp.name : 'Unknown';
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
          const joinTime = rec.joinedAt ? formatTime12(rec.joinedAt) : 'N/A';
          const statusText = rec.isOnTime ? 'On Time' : `${rec.minutesLate}m late`;
          const scoreSign = rec.dailyScore >= 0 ? `+${rec.dailyScore.toFixed(1)}` : `${rec.dailyScore.toFixed(1)}`;
          return `${medal} *${name}* — ⏰ Joined: *${joinTime}* (\`${scoreSign} 🪙 WP\` • ${statusText})`;
        }).join('\n'),
      },
    },
  ];

  if (absentRecords.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*❌ Missing/Absent Attendees (Did Not Join):*\n` + absentRecords.map((r) => {
          const emp = empMap.get(r.employeeId);
          const penalty = r.dailyScore < 0 ? ` (\`${r.dailyScore.toFixed(1)} 🪙 WP\` deduction)` : '';
          return `• *${emp ? emp.name : 'Unknown'}*${penalty} — _Did not join_`;
        }).join('\n'),
      },
    });
  }

  // Warning footer block
  blocks.push(
    {
      type: 'divider',
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: warningMsg,
        },
      ],
    }
  );

  const payload: SlackPayload = {
    channel: settings.slackChannel || '#standup',
    text: `${meetingTitle} — ${dateFormatted} (${presentRecords.length}/${totalEmployees} Present)`,
    blocks,
  };

  return { payload, markdownText: md };
}

/**
 * Generate Saturday Weekly Leaderboard Digest for Slack with Join Timestamps
 */
export function generateWeeklySlackReport(
  weekLabel: string,
  rankings: WeeklyEmployeeRanking[],
  settings: Settings,
  records?: AttendanceRecord[],
  meetings?: Meeting[]
): { payload: SlackPayload; markdownText: string } {
  let md = `*👑 WebPenter Saturday Weekly Leaderboard — ${weekLabel}*\n\n`;

  const eligibleList = rankings.filter((r) => r.isEligible);

  // Helper to format an employee's join timestamp for the week
  const getEmployeeJoinDetail = (empId: string): string => {
    if (!records || records.length === 0) return '';
    const empRecs = records.filter((rec) => rec.employeeId === empId);
    if (empRecs.length === 0) return '';
    const joinWithTime = empRecs.find((rec) => rec.joinedAt);
    if (joinWithTime && joinWithTime.joinedAt) {
      const timeStr = formatTime12(joinWithTime.joinedAt);
      const lateStr = joinWithTime.isOnTime ? 'On Time' : `${joinWithTime.minutesLate}m late`;
      return ` • ⏰ Joined: *${timeStr}* (${lateStr})`;
    }
    const absentRec = empRecs.find((rec) => rec.status === 'absent');
    if (absentRec) {
      return ` • ❌ _Did not join_`;
    }
    return '';
  };

  md += `*🥇 Top 3 Punctuality Champions:*\n`;
  eligibleList.slice(0, 3).forEach((r, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
    const joinDetail = getEmployeeJoinDetail(r.employee.id);
    md += `${medal} *${r.employee.name}* — \`${r.netPoints.toFixed(1)} 🪙 WP\`${joinDetail} | ${r.presentMeetings}/${r.totalScheduledMeetings} (${r.attendancePercentage}%) | Avg: ${r.averagePunctualityScore.toFixed(1)} 🪙 WP\n`;
  });

  md += `\n*📊 Full Weekly Standings & Join Timestamps:*\n`;
  rankings.forEach((r) => {
    const statusTag = r.isEligible ? '`Eligible`' : '`Not Eligible`';
    const fineText = r.salaryDeductionAmount > 0 ? ` • Fine: *${settings.salaryCurrency} ${r.salaryDeductionAmount}*` : '';
    const joinDetail = getEmployeeJoinDetail(r.employee.id);
    md += `${r.rank}. *${r.employee.name}* — \`${r.netPoints.toFixed(1)} 🪙 WP\`${joinDetail} (${r.attendancePercentage}% att, ${r.averagePunctualityScore.toFixed(1)} avg) [${statusTag}]${fineText}\n`;
  });

  const warningMsg = `⚠️ *Notice:* Negative 🪙 WP coin balances result in payroll salary deductions (${settings.finePerMinusPoint} ${settings.salaryCurrency}/point). Consistent attendance is required for leaderboard qualification.`;
  md += `\n---\n${warningMsg}`;

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `👑 Weekly Standup Leaderboard (${weekLabel})`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🏆 Weekly Top Performers:*\n` +
          eligibleList.slice(0, 3).map((r, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
            const joinDetail = getEmployeeJoinDetail(r.employee.id);
            return `${medal} *${r.employee.name}* — \`${r.netPoints.toFixed(1)} 🪙 WP\`${joinDetail} (${r.attendancePercentage}% attendance • Avg: ${r.averagePunctualityScore.toFixed(1)})`;
          }).join('\n'),
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📋 Standings Summary & Join Times:*\n` +
          rankings.map((r) => {
            const badge = r.isEligible ? '✅' : '⚠️';
            const fine = r.salaryDeductionAmount > 0 ? ` (Deduction: ${settings.salaryCurrency} ${r.salaryDeductionAmount})` : '';
            const joinDetail = getEmployeeJoinDetail(r.employee.id);
            return `${badge} *#${r.rank} ${r.employee.name}*: \`${r.netPoints.toFixed(1)} 🪙 WP\`${joinDetail} • Att: ${r.attendancePercentage}% • Avg: ${r.averagePunctualityScore.toFixed(1)}${fine}`;
          }).join('\n'),
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: warningMsg,
        },
      ],
    },
  ];

  const payload: SlackPayload = {
    channel: settings.slackChannel || '#standup',
    text: `👑 Weekly Standup Leaderboard — ${weekLabel}`,
    blocks,
  };

  return { payload, markdownText: md };
}

/**
 * Generate Month-End Grand Champions and HR Salary Deductions Slack Report
 */
export function generateMonthlySlackReport(
  monthLabel: string,
  monthlyRankings: MonthlyEmployeeRanking[],
  settings: Settings
): { payload: SlackPayload; markdownText: string } {
  let md = `*🎉 WebPenter Monthly Grand Champions & Standup Summary — ${monthLabel}*\n\n`;

  const top3Winners = monthlyRankings.filter((r) => r.isMonthlyWinner);
  md += `*🌟 MONTHLY GRAND WINNERS (Company Reward Recipients):*\n`;
  top3Winners.forEach((r) => {
    md += `${r.rewardBadge}: *${r.employee.name}* — Total: \`${r.totalWP.toFixed(1)} 🪙 WP\` | Attendance: ${r.attendancePercentage}% | Avg: ${r.averagePunctualityScore.toFixed(1)}\n`;
  });

  md += `\n*📑 Monthly Attendance & HR Salary Deductions Summary:*\n`;
  monthlyRankings.forEach((r) => {
    const fineText = r.totalSalaryDeduction > 0
      ? ` 💸 *Fine Deduction:* ${settings.salaryCurrency} ${r.totalSalaryDeduction}`
      : ' ✨ *Clean Record*';
    md += `${r.rank}. *${r.employee.name}* — \`${r.totalWP.toFixed(1)} 🪙 WP\` (${r.attendancePercentage}% att, ${r.averagePunctualityScore.toFixed(1)} avg)${fineText}\n`;
  });

  const note = settings.monthlyGrandRewardNotes || '🎉 Congratulations to our monthly champions! Company bonuses will be distributed with payroll.';
  md += `\n---\n_${note}_`;

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🎉 Monthly Standup Grand Champions — ${monthLabel}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🏆 Grand Winners & Company Rewards:*\n` +
          top3Winners.map((r) => `${r.rewardBadge}: *${r.employee.name}* (\`${r.totalWP.toFixed(1)} 🪙 WP\` • ${r.attendancePercentage}% att)`).join('\n'),
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📋 Monthly Employee & Payroll Summary:*\n` +
          monthlyRankings.map((r) => {
            const fine = r.totalSalaryDeduction > 0 ? ` • 💸 Deduction: ${settings.salaryCurrency} ${r.totalSalaryDeduction}` : '';
            return `*#${r.rank} ${r.employee.name}*: \`${r.totalWP.toFixed(1)} 🪙 WP\` • ${r.attendancePercentage}% att • Avg: ${r.averagePunctualityScore.toFixed(1)}${fine}`;
          }).join('\n'),
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: note,
        },
      ],
    },
  ];

  const payload: SlackPayload = {
    channel: settings.slackChannel || '#standup',
    text: `🎉 Monthly Standup Champions — ${monthLabel}`,
    blocks,
  };

  return { payload, markdownText: md };
}

/**
 * Dispatches a Slack payload to the webhook URL
 */
export async function sendSlackWebhook(webhookUrl: string, payload: SlackPayload): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
    return {
      success: false,
      message: 'Invalid Slack Webhook URL. Please configure a valid https://hooks.slack.com/... URL in Settings.',
    };
  }

  // 1. Try via Chrome Extension runtime if available (bypasses browser CORS)
  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
    try {
      const response = await new Promise<{ success: boolean; message: string } | null>((resolve) => {
        let responded = false;
        try {
          chrome.runtime.sendMessage(
            {
              type: 'SEND_SLACK_WEBHOOK',
              payload: { webhookUrl, payload },
            },
            (res) => {
              responded = true;
              if (chrome.runtime.lastError || !res) {
                resolve(null);
              } else {
                resolve(res);
              }
            }
          );
          // Timeout safety
          setTimeout(() => {
            if (!responded) resolve(null);
          }, 1500);
        } catch {
          resolve(null);
        }
      });

      if (response && response.success) {
        return response;
      }
    } catch {
      // Fallback to direct fetch
    }
  }

  // 2. Direct browser fetch fallback (using text/plain & no-cors to avoid CORS preflight blocks in standard web dashboard)
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return { success: true, message: 'Report successfully dispatched to Slack channel!' };
  } catch (err: any) {
    return { success: false, message: `Failed to reach Slack: ${err.message || String(err)}` };
  }
}
