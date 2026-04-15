export const ATTENDANCE_TARGET_PERCENTAGE = 75;

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

export const calculateRecoveryPlan = ({ present, total, targetPercentage = ATTENDANCE_TARGET_PERCENTAGE }) => {
  const safePresent = Number(present) || 0;
  const safeTotal = Number(total) || 0;
  const target = Number(targetPercentage) || ATTENDANCE_TARGET_PERCENTAGE;

  if (safeTotal <= 0) {
    return {
      hasData: false,
      present: 0,
      total: 0,
      targetPercentage: target,
      currentPercentage: 0,
      belowTarget: false,
      classesNeededToReachTarget: 0,
      projectedAfterOnePresent: 100
    };
  }

  const targetRatio = target / 100;
  const currentRatio = safePresent / safeTotal;
  const currentPercentage = Number((currentRatio * 100).toFixed(2));
  const belowTarget = currentRatio < targetRatio;

  let classesNeededToReachTarget = 0;
  if (belowTarget) {
    classesNeededToReachTarget = Math.max(
      0,
      Math.ceil((targetRatio * safeTotal - safePresent) / (1 - targetRatio))
    );
  }

  const projectedAfterOnePresent = Number((((safePresent + 1) / (safeTotal + 1)) * 100).toFixed(2));

  return {
    hasData: true,
    present: safePresent,
    total: safeTotal,
    targetPercentage: target,
    currentPercentage,
    belowTarget,
    classesNeededToReachTarget,
    projectedAfterOnePresent
  };
};

const buildRecommendation = (analysis) => {
  if (!analysis.hasData) {
    return "No attendance records available yet for prediction.";
  }

  if (!analysis.belowTarget) {
    return `Good standing. Keep attendance above ${analysis.targetPercentage}% to stay safe.`;
  }

  if (analysis.classesNeededToReachTarget <= 1) {
    return `Warning: attendance is below ${analysis.targetPercentage}%. Attend the next class to move back to the safe zone.`;
  }

  return `Warning: attendance is below ${analysis.targetPercentage}%. Attend the next ${analysis.classesNeededToReachTarget} classes in a row to recover above ${analysis.targetPercentage}%.`;
};

export const buildCourseAttendanceInsights = (
  records,
  targetPercentage = ATTENDANCE_TARGET_PERCENTAGE
) => {
  const grouped = Array.isArray(records)
    ? records.reduce((acc, item) => {
        const courseId = item.course_id || item.course_name || item.course || "course";
        const key = String(courseId);

        if (!acc[key]) {
          acc[key] = {
            course_id: item.course_id || key,
            course_name: item.course || item.course_name || "Course",
            present: 0,
            absent: 0,
            total: 0
          };
        }

        if (normalizeStatus(item.status) === "present") {
          acc[key].present += 1;
        } else {
          acc[key].absent += 1;
        }

        acc[key].total += 1;
        return acc;
      }, {})
    : {};

  return Object.values(grouped)
    .map((row) => {
      const analysis = calculateRecoveryPlan({
        present: row.present,
        total: row.total,
        targetPercentage
      });

      return {
        ...row,
        percentage: analysis.currentPercentage.toFixed(2),
        analysis,
        recommendation: buildRecommendation(analysis)
      };
    })
    .sort((a, b) => a.course_name.localeCompare(b.course_name));
};
