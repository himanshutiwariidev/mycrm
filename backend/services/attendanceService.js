const crypto = require("crypto");
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const { emitAttendanceEvent } = require("../utils/socket");

const ATTENDANCE_STATUS = {
  ACTIVE: "Active",
  OFFLINE: "Offline",
};

const formatServerDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const dateFromYmd = (ymd) => {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const diffMinutes = (start, end) => {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / 60000));
};

const overlapMinutes = (sessionStart, sessionEnd, windowStart, windowEnd) => {
  const start = Math.max(new Date(sessionStart).getTime(), new Date(windowStart).getTime());
  const end = Math.min(new Date(sessionEnd).getTime(), new Date(windowEnd).getTime());
  if (end <= start) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
};

const getSessionEnd = (row, now = new Date()) => {
  if (row.status === ATTENDANCE_STATUS.ACTIVE) return now;
  return row.logoutTime ? new Date(row.logoutTime) : now;
};

const getDayLateData = async (userId, loginTime) => {
  const date = formatServerDate(loginTime);
  const existingSessions = await Attendance.countDocuments({ userId, date });

  // Only first login of day should be considered for late.
  if (existingSessions > 0) {
    return { isLate: false, lateByMinutes: 0 };
  }

  const threshold = new Date(loginTime);
  threshold.setHours(10, 0, 0, 0);

  if (loginTime <= threshold) {
    return { isLate: false, lateByMinutes: 0 };
  }

  return {
    isLate: true,
    lateByMinutes: diffMinutes(threshold, loginTime),
  };
};

const normalizeStatus = (status) => {
  return status === ATTENDANCE_STATUS.ACTIVE ? ATTENDANCE_STATUS.ACTIVE : ATTENDANCE_STATUS.OFFLINE;
};

const computeSessionTotal = (record, referenceLogoutTime = null) => {
  const sessionEnd = referenceLogoutTime || record.logoutTime;
  record.totalSessionTime = diffMinutes(record.loginTime, sessionEnd);
  return record;
};

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value)) return new mongoose.Types.ObjectId(value);
  return null;
};

const getAdminIds = async () => {
  const admins = await User.find({ role: "admin" }).select("_id");
  return admins.map((item) => item._id);
};

const closePreviousActiveSession = async (userId, closeTime) => {
  const activeSession = await Attendance.findOne({
    userId,
    status: ATTENDANCE_STATUS.ACTIVE,
  }).sort({ loginTime: -1 });

  if (!activeSession) return null;

  activeSession.logoutTime = closeTime;
  activeSession.status = ATTENDANCE_STATUS.OFFLINE;
  computeSessionTotal(activeSession, closeTime);

  await activeSession.save();

  emitAttendanceEvent("attendance:auto-offline", {
    userId: String(userId),
    attendanceId: String(activeSession._id),
    sessionId: activeSession.sessionId,
  });

  return activeSession;
};

const createLoginAttendance = async (userId) => {
  const loginTime = new Date();

  await closePreviousActiveSession(userId, loginTime);

  const { isLate, lateByMinutes } = await getDayLateData(userId, loginTime);
  const record = await Attendance.create({
    userId,
    sessionId: crypto.randomUUID(),
    loginTime,
    logoutTime: null,
    date: formatServerDate(loginTime),
    status: ATTENDANCE_STATUS.ACTIVE,
    isLate,
    lateByMinutes,
  });

  emitAttendanceEvent("attendance:login", {
    userId: String(userId),
    attendanceId: String(record._id),
    sessionId: record.sessionId,
  });

  return record;
};

const logoutAttendance = async (userId) => {
  const record = await Attendance.findOne({
    userId,
    status: ATTENDANCE_STATUS.ACTIVE,
  }).sort({ loginTime: -1 });

  if (!record) {
    const error = new Error("No active attendance session found");
    error.statusCode = 404;
    throw error;
  }

  const logoutTime = new Date();
  record.logoutTime = logoutTime;
  record.status = ATTENDANCE_STATUS.OFFLINE;
  computeSessionTotal(record, logoutTime);

  await record.save();

  emitAttendanceEvent("attendance:logout", {
    userId: String(userId),
    attendanceId: String(record._id),
    sessionId: record.sessionId,
  });

  return record;
};

const buildQuery = ({ userId, status, fromDate, toDate, excludeUserIds = [] }) => {
  const query = {};

  if (userId) query.userId = userId;
  if (status) query.status = status;

  if (excludeUserIds.length) {
    if (query.userId) {
      query.userId = { $eq: query.userId, $nin: excludeUserIds };
    } else {
      query.userId = { $nin: excludeUserIds };
    }
  }

  if (fromDate || toDate) {
    query.loginTime = {};
    if (fromDate) query.loginTime.$gte = new Date(`${fromDate}T00:00:00`);
    if (toDate) query.loginTime.$lte = new Date(`${toDate}T23:59:59`);
  }

  return query;
};

const buildMonthRange = (month) => {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;

  const monthStart = new Date(year, monthIdx, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

  return { monthStart, monthEnd };
};

const normalizeRow = (row) => {
  const doc = row.toObject ? row.toObject() : row;
  return {
    ...doc,
    status: normalizeStatus(doc.status),
  };
};

const buildDaySplitTotals = (rows, rangeStart, rangeEnd, now = new Date()) => {
  const perDayMap = {};

  rows.forEach((row) => {
    const sessionStart = new Date(row.loginTime);
    const sessionEnd = getSessionEnd(row, now);

    const start = new Date(Math.max(sessionStart.getTime(), rangeStart.getTime()));
    const end = new Date(Math.min(sessionEnd.getTime(), rangeEnd.getTime()));

    if (end <= start) return;

    let cursor = startOfDay(start);
    while (cursor.getTime() <= end.getTime()) {
      const dayStart = startOfDay(cursor);
      const dayEnd = endOfDay(cursor);
      const ymd = formatServerDate(dayStart);
      const mins = overlapMinutes(start, end, dayStart, dayEnd);

      if (mins > 0) {
        perDayMap[ymd] = (perDayMap[ymd] || 0) + mins;
      }

      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return perDayMap;
};

const getAttendanceList = async (filters = {}) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
  const now = new Date();

  const adminIds = await getAdminIds();
  const baseQuery = buildQuery({
    userId: filters.userId,
    status: filters.status,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    excludeUserIds: adminIds,
  });

  let query = { ...baseQuery };
  if (filters.date) {
    const selectedDate = dateFromYmd(filters.date);
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    query = {
      ...baseQuery,
      loginTime: { $lte: dayEnd },
      $or: [{ logoutTime: { $gte: dayStart } }, { status: ATTENDANCE_STATUS.ACTIVE }],
    };
  }

  const [rowsRaw, total] = await Promise.all([
    Attendance.find(query)
      .populate("userId", "name email role")
      .sort({ loginTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Attendance.countDocuments(query),
  ]);

  let rows = rowsRaw
    .map(normalizeRow)
    .filter((item) => item.userId && item.userId.role !== "admin");

  if (filters.date) {
    const selectedDate = dateFromYmd(filters.date);
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    rows = rows
      .map((row) => {
        const minutesInSelectedDate = overlapMinutes(
          row.loginTime,
          getSessionEnd(row, now),
          dayStart,
          dayEnd
        );

        return {
          ...row,
          displayDate: filters.date,
          displayWorkingMinutes: minutesInSelectedDate,
        };
      })
      .filter((row) => row.displayWorkingMinutes > 0);
  } else {
    rows = rows.map((row) => ({
      ...row,
      displayDate: row.date,
      displayWorkingMinutes:
        row.status === ATTENDANCE_STATUS.ACTIVE
          ? diffMinutes(row.loginTime, now)
          : row.totalSessionTime || diffMinutes(row.loginTime, row.logoutTime),
    }));
  }

  const month = filters.month || formatServerDate(new Date()).slice(0, 7);
  const { monthStart, monthEnd } = buildMonthRange(month);

  const monthQuery = {
    ...buildQuery({
      userId: filters.userId,
      status: filters.status,
      excludeUserIds: adminIds,
    }),
    loginTime: { $lte: monthEnd },
    $or: [{ logoutTime: { $gte: monthStart } }, { status: ATTENDANCE_STATUS.ACTIVE }],
  };

  const monthRows = await Attendance.find(monthQuery).select(
    "loginTime logoutTime status totalSessionTime userId"
  );

  const perDayMap = buildDaySplitTotals(monthRows, monthStart, monthEnd, now);
  const perDay = Object.keys(perDayMap)
    .sort()
    .map((date) => ({
      date,
      totalMinutes: perDayMap[date],
      totalHours: Number((perDayMap[date] / 60).toFixed(2)),
    }));

  const monthlyTotalMinutes = perDay.reduce((sum, item) => sum + item.totalMinutes, 0);

  const overallDate = filters.date || formatServerDate(new Date());
  const overallDayStart = startOfDay(dateFromYmd(overallDate));
  const overallDayEnd = endOfDay(dateFromYmd(overallDate));

  const overallQuery = {
    ...buildQuery({
      userId: filters.userId,
      status: filters.status,
      excludeUserIds: adminIds,
    }),
    loginTime: { $lte: overallDayEnd },
    $or: [{ logoutTime: { $gte: overallDayStart } }, { status: ATTENDANCE_STATUS.ACTIVE }],
  };

  const overallRows = await Attendance.find(overallQuery).select("loginTime logoutTime status userId");
  const todayOverallMinutes = overallRows.reduce((sum, row) => {
    return sum + overlapMinutes(row.loginTime, getSessionEnd(row, now), overallDayStart, overallDayEnd);
  }, 0);

  return {
    rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    summary: {
      month,
      perDay,
      monthlyTotalMinutes,
      monthlyTotalHours: Number((monthlyTotalMinutes / 60).toFixed(2)),
      overallDate,
      todayOverallMinutes,
      todayOverallHours: Number((todayOverallMinutes / 60).toFixed(2)),
    },
  };
};

const getTodayAttendance = async (filters = {}) => {
  const today = formatServerDate(new Date());
  return getAttendanceList({ ...filters, date: today });
};

const getAttendanceByUser = async (userId, filters = {}) => {
  const user = await User.findById(userId).select("role");
  if (!user || user.role === "admin") {
    return {
      rows: [],
      pagination: { page: 1, limit: Number(filters.limit) || 10, total: 0, totalPages: 1 },
      summary: {
        month: filters.month || formatServerDate(new Date()).slice(0, 7),
        perDay: [],
        monthlyTotalMinutes: 0,
        monthlyTotalHours: 0,
        overallDate: filters.date || formatServerDate(new Date()),
        todayOverallMinutes: 0,
        todayOverallHours: 0,
      },
    };
  }
  return getAttendanceList({ ...filters, userId });
};

const exportAttendanceWorkbookBuffer = async (filters = {}) => {
  const adminIds = await getAdminIds();
  const now = new Date();

  let exportStart;
  let exportEnd;

  if (filters.date) {
    const d = dateFromYmd(filters.date);
    exportStart = startOfDay(d);
    exportEnd = endOfDay(d);
  } else if (filters.month) {
    const r = buildMonthRange(filters.month);
    exportStart = r.monthStart;
    exportEnd = r.monthEnd;
  } else if (filters.fromDate || filters.toDate) {
    exportStart = filters.fromDate
      ? new Date(`${filters.fromDate}T00:00:00`)
      : new Date(0);
    exportEnd = filters.toDate
      ? new Date(`${filters.toDate}T23:59:59`)
      : now;
  } else {
    const currentMonth = formatServerDate(now).slice(0, 7);
    const r = buildMonthRange(currentMonth);
    exportStart = r.monthStart;
    exportEnd = r.monthEnd;
  }

  const query = {
    ...buildQuery({
      userId: filters.userId,
      status: filters.status,
      excludeUserIds: adminIds,
    }),
    loginTime: { $lte: exportEnd },
    $or: [{ logoutTime: { $gte: exportStart } }, { status: ATTENDANCE_STATUS.ACTIVE }],
  };

  const rows = await Attendance.find(query)
    .populate("userId", "name email role")
    .sort({ loginTime: -1 });

  const dailyMap = {};

  rows
    .filter((row) => row.userId && row.userId.role !== "admin")
    .forEach((row) => {
      const sessionStart = new Date(row.loginTime);
      const sessionEnd = getSessionEnd(row, now);
      const boundedStart = new Date(Math.max(sessionStart.getTime(), exportStart.getTime()));
      const boundedEnd = new Date(Math.min(sessionEnd.getTime(), exportEnd.getTime()));

      if (boundedEnd <= boundedStart) return;

      let cursor = startOfDay(boundedStart);
      while (cursor.getTime() <= boundedEnd.getTime()) {
        const dayStart = startOfDay(cursor);
        const dayEnd = endOfDay(cursor);
        const date = formatServerDate(dayStart);

        const overlapStart = new Date(
          Math.max(boundedStart.getTime(), dayStart.getTime())
        );
        const overlapEnd = new Date(
          Math.min(boundedEnd.getTime(), dayEnd.getTime())
        );
        const minutes = overlapMinutes(overlapStart, overlapEnd, dayStart, dayEnd);

        if (minutes > 0) {
          const uid = String(row.userId._id || row.userId);
          const key = `${uid}__${date}`;
          const current = dailyMap[key] || {
            Name: row.userId?.name || "N/A",
            Email: row.userId?.email || "N/A",
            Date: date,
            FirstLoginTime: overlapStart,
            LastLogoutTime: overlapEnd,
            TotalActiveMinutes: 0,
          };

          if (overlapStart < current.FirstLoginTime) current.FirstLoginTime = overlapStart;
          if (overlapEnd > current.LastLogoutTime) current.LastLogoutTime = overlapEnd;
          current.TotalActiveMinutes += minutes;

          dailyMap[key] = current;
        }

        cursor.setDate(cursor.getDate() + 1);
      }
    });

  const exportRows = Object.values(dailyMap)
    .sort((a, b) => {
      if (a.Date === b.Date) return a.Name.localeCompare(b.Name);
      return a.Date.localeCompare(b.Date);
    })
    .map((row) => ({
      Name: row.Name,
      Email: row.Email,
      Date: row.Date,
      FirstLoginTime: row.FirstLoginTime ? new Date(row.FirstLoginTime).toISOString() : "",
      LastLogoutTime: row.LastLogoutTime ? new Date(row.LastLogoutTime).toISOString() : "",
      TotalActiveMinutes: row.TotalActiveMinutes,
      TotalActiveHours: Number((row.TotalActiveMinutes / 60).toFixed(2)),
    }));

  try {
    const XLSX = require("xlsx");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    return {
      buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
      extension: "xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } catch {
    const headers = [
      "Name",
      "Email",
      "Date",
      "FirstLoginTime",
      "LastLogoutTime",
      "TotalActiveMinutes",
      "TotalActiveHours",
    ];
    const lines = [headers.join(",")];
    exportRows.forEach((row) => {
      const values = headers.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`);
      lines.push(values.join(","));
    });
    return {
      buffer: Buffer.from(lines.join("\n"), "utf-8"),
      extension: "csv",
      mimeType: "text/csv",
    };
  }
};

module.exports = {
  ATTENDANCE_STATUS,
  createLoginAttendance,
  logoutAttendance,
  getAttendanceList,
  getTodayAttendance,
  getAttendanceByUser,
  exportAttendanceWorkbookBuffer,
};
