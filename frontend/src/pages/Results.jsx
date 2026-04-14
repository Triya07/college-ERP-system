import React, { useState, useEffect } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

function Results() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const canManageResults = user?.role === "admin" || user?.role === "teacher";

  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentCourses, setStudentCourses] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState("midsem");
  const [courseMarksById, setCourseMarksById] = useState({});
  const [savingCourseId, setSavingCourseId] = useState(null);
  const [filters, setFilters] = useState({
    department: "",
    year: "",
    semester: "",
    search: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchResults();
    if (canManageResults) {
      fetchStudents();
    }
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await API.get("/results");
      setResults(response.data);
      setError("");
    } catch (err) {
      console.log("Error fetching results:", err);
      setError("Could not load results");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await API.get("/students");
      setStudents(response.data);
    } catch (err) {
      console.log("Error fetching students:", err);
    }
  };

  const fetchStudentCourses = async (studentId, examType = selectedExamType) => {
    try {
      const response = await API.get(`/students/${studentId}/courses`);
      const rows = response.data || [];
      setStudentCourses(rows);
      hydrateCourseMarks(rows, studentId, examType);
    } catch (err) {
      console.log("Error fetching student courses:", err);
      setStudentCourses([]);
    }
  };

  const normalize = (value) => String(value || "").trim().toLowerCase();

  const getLatestResultFor = (studentId, courseId, examType) => {
    return results.find(
      (row) =>
        Number(row.student_id) === Number(studentId) &&
        Number(row.course_id) === Number(courseId) &&
        normalize(row.exam_type || "semester") === normalize(examType)
    );
  };

  const hydrateCourseMarks = (coursesList, studentId, examType) => {
    const next = {};
    (coursesList || []).forEach((course) => {
      const existing = getLatestResultFor(studentId, course.course_id, examType);
      next[course.course_id] = {
        marks_obtained: existing?.marks_obtained ?? "",
        total_marks: existing?.total_marks ?? 100,
        result_id: existing?.result_id || null
      };
    });
    setCourseMarksById(next);
  };

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    await fetchStudentCourses(student.student_id, selectedExamType);
  };

  const handleExamTypeChange = (value) => {
    setSelectedExamType(value);
    if (selectedStudent) {
      hydrateCourseMarks(studentCourses, selectedStudent.student_id, value);
    }
  };

  const handleCourseMarkChange = (courseId, field, value) => {
    setCourseMarksById((prev) => ({
      ...prev,
      [courseId]: {
        ...(prev[courseId] || {}),
        [field]: value
      }
    }));
  };

  const saveCourseResult = async (course) => {
    if (!selectedStudent) return;

    const entry = courseMarksById[course.course_id] || {};
    const marks = Number(entry.marks_obtained);
    const total = Number(entry.total_marks);

    if (Number.isNaN(marks) || Number.isNaN(total) || total <= 0 || marks < 0) {
      setError("Please enter valid marks and total marks.");
      return;
    }

    try {
      setError("");
      setSavingCourseId(course.course_id);

      const payload = {
        student_id: selectedStudent.student_id,
        course_id: course.course_id,
        exam_type: selectedExamType,
        marks_obtained: marks,
        total_marks: total
      };

      if (entry.result_id) {
        await API.put(`/results/${entry.result_id}`, payload);
      } else {
        await API.post("/results", payload);
      }

      await fetchResults();
      hydrateCourseMarks(studentCourses, selectedStudent.student_id, selectedExamType);
    } catch (err) {
      console.error("result save error", err);
      const msg = err.response?.data || err.message || "Could not save result";
      setError(msg);
    } finally {
      setSavingCourseId(null);
    }
  };

  const percentageFrom = (obtained, total) => {
    const o = Number(obtained);
    const t = Number(total);
    if (!t) return 0;
    return (o / t) * 100;
  };

  const gradeFromPercentage = (percentage) => {
    if (percentage >= 90) return "A";
    if (percentage >= 80) return "B";
    if (percentage >= 70) return "C";
    if (percentage >= 60) return "D";
    return "F";
  };

  const gradeBadgeClass = (grade) => {
    if (grade === "A") return "bg-success";
    if (grade === "B") return "bg-info";
    if (grade === "C" || grade === "D") return "bg-warning";
    return "bg-danger";
  };

  const studentRowsByType = (type) =>
    results.filter((row) => String(row.exam_type || "semester").toLowerCase() === type);

  const departmentOptions = [...new Set(students.map((s) => s.department).filter(Boolean))].sort();
  const yearOptions = [...new Set(students.map((s) => String(s.year || "")).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const semesterOptions = [...new Set(students.map((s) => String(s.semester || "")).filter(Boolean))].sort((a, b) => Number(a) - Number(b));

  const filteredStudents = students.filter((s) => {
    if (filters.department && normalize(s.department) !== normalize(filters.department)) return false;
    if (filters.year && String(s.year || "") !== String(filters.year)) return false;
    if (filters.semester && String(s.semester || "") !== String(filters.semester)) return false;

    if (filters.search) {
      const query = normalize(filters.search);
      const candidate = normalize(`${s.name || ""} ${s.academic_id || ""} ${s.roll_number || ""}`);
      if (!candidate.includes(query)) return false;
    }

    return true;
  });

  useEffect(() => {
    if (!selectedStudent) return;
    const stillVisible = filteredStudents.some((s) => Number(s.student_id) === Number(selectedStudent.student_id));
    if (!stillVisible) {
      setSelectedStudent(null);
      setStudentCourses([]);
      setCourseMarksById({});
    }
  }, [filters, students]);

  const panelStyle = {
    backgroundColor: "var(--surface-bg)",
    border: "1px solid var(--border-color)",
    color: "var(--text-main)"
  };

  const softPanelStyle = {
    backgroundColor: "var(--surface-2-bg)",
    border: "1px solid var(--border-color)",
    color: "var(--text-main)"
  };

  const studentGroupCards = Object.values(
    filteredStudents.reduce((acc, s) => {
      const department = s.department || "General";
      const year = String(s.year || "-");
      const semester = s.semester || "-";
      const key = `${department}|${year}|${semester}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          department,
          year,
          semester,
          students: []
        };
      }
      acc[key].students.push(s);
      return acc;
    }, {})
  ).sort((a, b) => {
    if (a.department !== b.department) return a.department.localeCompare(b.department);
    const yearDiff = Number(a.year) - Number(b.year);
    if (!Number.isNaN(yearDiff) && yearDiff !== 0) return yearDiff;
    return String(a.semester).localeCompare(String(b.semester));
  });

  const semesterByCourse = Object.values(
    results.reduce((acc, row) => {
      const key = row.course_id;
      if (!acc[key]) {
        acc[key] = {
          course_id: row.course_id,
          course_name: row.course_name,
          credits: Number(row.credits) || 0,
          marks_obtained: 0,
          total_marks: 0
        };
      }
      acc[key].marks_obtained += Number(row.marks_obtained) || 0;
      acc[key].total_marks += Number(row.total_marks) || 0;
      return acc;
    }, {})
  );

  const totalCredits = semesterByCourse.reduce((sum, row) => sum + (Number(row.credits) || 0), 0);
  const weightedPercentage = totalCredits
    ? semesterByCourse.reduce((sum, row) => {
        const percentage = percentageFrom(row.marks_obtained, row.total_marks);
        return sum + percentage * (Number(row.credits) || 0);
      }, 0) / totalCredits
    : 0;

  const renderReadOnlyExamTable = (title, rows) => (
    <div className="shadow-sm rounded p-4 mb-4" style={panelStyle}>
      <h5>{title}</h5>
      <table className="table table-bordered mt-3">
        <thead>
          <tr>
            <th>Course</th>
            <th>Credit</th>
            <th>Marks</th>
            <th>Total</th>
            <th>Percentage</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan="6" className="text-center">No {title.toLowerCase()} results</td>
            </tr>
          ) : (
            rows.map((row) => {
              const percentage = percentageFrom(row.marks_obtained, row.total_marks);
              const grade = gradeFromPercentage(percentage);
              return (
                <tr key={`${title}-${row.result_id}`}>
                  <td>{row.course_name}</td>
                  <td>{row.credits ?? "-"}</td>
                  <td>{row.marks_obtained}</td>
                  <td>{row.total_marks}</td>
                  <td>{percentage.toFixed(2)}%</td>
                  <td><span className={`badge ${gradeBadgeClass(grade)}`}>{grade}</span></td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <h2 className="mb-4">Examination & Results</h2>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {isStudent && (
        <>
          {renderReadOnlyExamTable("Midsem", studentRowsByType("midsem"))}
          {renderReadOnlyExamTable("Endsem", studentRowsByType("endsem"))}

          <div className="shadow-sm rounded p-4 mb-4" style={panelStyle}>
            <h5>Whole Semester Result</h5>
            <div className="mb-3 d-flex gap-4 flex-wrap">
              <div><strong>Total Credits:</strong> {totalCredits}</div>
              <div><strong>Weighted Percentage:</strong> {weightedPercentage.toFixed(2)}%</div>
            </div>
            <table className="table table-bordered mt-3">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Credit</th>
                  <th>Semester Marks</th>
                  <th>Semester Total</th>
                  <th>Percentage</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {semesterByCourse.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center">No semester results found</td>
                  </tr>
                ) : (
                  semesterByCourse.map((row) => {
                    const percentage = percentageFrom(row.marks_obtained, row.total_marks);
                    const grade = gradeFromPercentage(percentage);
                    return (
                      <tr key={`semester-${row.course_id}`}>
                        <td>{row.course_name}</td>
                        <td>{row.credits}</td>
                        <td>{row.marks_obtained.toFixed(2)}</td>
                        <td>{row.total_marks.toFixed(2)}</td>
                        <td>{percentage.toFixed(2)}%</td>
                        <td><span className={`badge ${gradeBadgeClass(grade)}`}>{grade}</span></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canManageResults && (
        <>
          <div className="shadow-sm rounded p-4 mb-4" style={panelStyle}>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h5 className="mb-0">Result Entry by Branch and Semester</h5>
              <span className="badge text-bg-secondary">{filteredStudents.length} students matched</span>
            </div>

            <div className="row g-2 align-items-end">
              <div className="col-md-2">
                <label className="form-label mb-1">Branch</label>
                <select
                  className="form-select"
                  value={filters.department}
                  onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
                >
                  <option value="">All</option>
                  {departmentOptions.map((dep) => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label mb-1">Year</label>
                <select
                  className="form-select"
                  value={filters.year}
                  onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
                >
                  <option value="">All</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label mb-1">Semester</label>
                <select
                  className="form-select"
                  value={filters.semester}
                  onChange={(e) => setFilters((prev) => ({ ...prev, semester: e.target.value }))}
                >
                  <option value="">All</option>
                  {semesterOptions.map((sem) => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label mb-1">Exam Type</label>
                <select
                  className="form-select"
                  value={selectedExamType}
                  onChange={(e) => handleExamTypeChange(e.target.value)}
                >
                  <option value="midsem">Midsem</option>
                  <option value="endsem">Endsem</option>
                  <option value="semester">Semester</option>
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label mb-1">Search Student</label>
                <input
                  className="form-control"
                  placeholder="Name / Roll No / Academic ID"
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
              </div>

              <div className="col-md-1 d-grid">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setFilters({ department: "", year: "", semester: "", search: "" })}
                >
                  Clear
                </button>
              </div>
            </div>

            <p className="text-muted mt-2 mb-0">Choose a student from the correct branch and semester card, then enter marks for their enrolled subjects.</p>
          </div>

          <div className="row g-3 mb-4">
            {studentGroupCards.length === 0 ? (
              <div className="col-12">
                <div className="shadow-sm rounded p-4 text-muted" style={panelStyle}>No students available for results entry.</div>
              </div>
            ) : (
              studentGroupCards.map((group) => (
                <div className="col-lg-6" key={group.key}>
                  <div className="card h-100 shadow-sm border-0" style={softPanelStyle}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">{group.department} | Year {group.year} | Sem {group.semester}</h6>
                        <span className="badge text-bg-primary">{group.students.length} Students</span>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {group.students.map((student) => {
                          const selected = Number(selectedStudent?.student_id) === Number(student.student_id);
                          return (
                            <button
                              key={student.student_id}
                              type="button"
                              className={`btn btn-sm ${selected ? "btn-primary" : "btn-outline-primary"}`}
                              onClick={() => handleSelectStudent(student)}
                              title={student.academic_id || ""}
                            >
                              {student.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedStudent && (
            <div className="shadow-sm rounded p-4 mb-4" style={panelStyle}>
              <h5 className="mb-1">{selectedStudent.name} | {selectedStudent.department || "General"} | Sem {selectedStudent.semester || "-"}</h5>
              <p className="text-muted mb-3">Enter {selectedExamType.toUpperCase()} marks subject-wise for enrolled courses.</p>

              <div className="row g-3">
                {studentCourses.length === 0 ? (
                  <div className="col-12 text-muted">No enrolled subjects found for this student.</div>
                ) : (
                  studentCourses.map((course) => {
                    const entry = courseMarksById[course.course_id] || {};
                    return (
                      <div className="col-md-6" key={course.course_id}>
                        <div className="card border-0 shadow-sm h-100">
                          <div className="card-body">
                            <h6 className="mb-1">{course.course_name}</h6>
                            <div className="small text-muted mb-3">{course.course_code || "-"} | Credits {course.credits ?? "-"} | Sem {course.semester || "-"}</div>

                            <div className="row g-2">
                              <div className="col-6">
                                <input
                                  type="number"
                                  className="form-control"
                                  placeholder="Marks"
                                  value={entry.marks_obtained ?? ""}
                                  onChange={(e) => handleCourseMarkChange(course.course_id, "marks_obtained", e.target.value)}
                                />
                              </div>
                              <div className="col-6">
                                <input
                                  type="number"
                                  className="form-control"
                                  placeholder="Total"
                                  value={entry.total_marks ?? ""}
                                  onChange={(e) => handleCourseMarkChange(course.course_id, "total_marks", e.target.value)}
                                />
                              </div>
                            </div>

                            <button
                              className="btn btn-danger btn-sm mt-3"
                              type="button"
                              onClick={() => saveCourseResult(course)}
                              disabled={savingCourseId === course.course_id}
                            >
                              {savingCourseId === course.course_id
                                ? "Saving..."
                                : entry.result_id
                                ? "Update Marks"
                                : "Save Marks"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Results Table */}
      <div className="shadow-sm rounded p-4" style={panelStyle}>
        <h5>{isStudent ? "All Result Entries" : "Results List"}</h5>

        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student</th>
              <th>Course</th>
              <th>Exam Type</th>
              <th>Credit</th>
              <th>Marks</th>
              <th>Total</th>
              <th>Percentage</th>
              <th>Grade</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center">
                  Loading...
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center">
                  No results found
                </td>
              </tr>
            ) : (
              results.map((result) => {
                const percentage = percentageFrom(result.marks_obtained, result.total_marks);
                const grade = gradeFromPercentage(percentage);

                return (
                  <tr key={result.result_id}>
                    <td>{result.result_id}</td>
                    <td>{result.student_name}</td>
                    <td>{result.course_name}</td>
                    <td>{String(result.exam_type || "semester").toUpperCase()}</td>
                    <td>{result.credits ?? "-"}</td>
                    <td>{result.marks_obtained}</td>
                    <td>{result.total_marks}</td>
                    <td>{percentage.toFixed(2)}%</td>
                    <td>
                      <span className={`badge ${gradeBadgeClass(grade)}`}>
                        {grade}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Results;
