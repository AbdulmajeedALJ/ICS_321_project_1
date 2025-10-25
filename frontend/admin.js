const API_URL = "http://localhost:1234/";

const escapeSqlString = (value) => {
  if (typeof value !== "string") return value;
  return value.replace(/'/g, "''").trim();
};

const toNumber = (raw) => {
  if (raw === null || raw === undefined || raw === "") return NaN;
  const num = Number(raw);
  return Number.isFinite(num) ? num : NaN;
};

const sanitizeIdentifier = (raw, requiredPrefix) => {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const normalized = trimmed.toLowerCase();
  if (requiredPrefix && !normalized.startsWith(requiredPrefix.toLowerCase())) {
    return "";
  }
  if (!/^[a-z]+[0-9]+$/.test(normalized)) {
    return "";
  }
  return normalized;
};

const normalizeQuery = (sql) =>
  (sql || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ");

const formatQuery = (template, params) =>
  template.replace(/\{(\w+)\}/g, (match, key) => {
    if (!(key in params)) {
      throw new Error(`Missing template parameter: ${key}`);
    }
    return params[key];
  });

let queriesCache;
const loadQueries = async () => {
  if (queriesCache) return queriesCache;
  const response = await fetch("./queries.json");
  if (!response.ok) {
    throw new Error("Failed to load query definitions.");
  }
  queriesCache = await response.json();
  return queriesCache;
};

const getAdminQueries = async () => {
  const queries = await loadQueries();
  const adminQueries = queries?.admin;
  if (!adminQueries) {
    throw new Error("Admin query definitions are missing.");
  }
  return adminQueries;
};

const getAdminQuery = async (key) => {
  const adminQueries = await getAdminQueries();
  if (!(key in adminQueries)) {
    throw new Error(`Admin query '${key}' is not defined.`);
  }
  return adminQueries[key];
};

const renderTable = (data) => {
  if (data === null || data === undefined) {
    return "<p>No rows returned.</p>";
  }

  const rowsArray = Array.isArray(data) ? data : [data];

  if (rowsArray.length === 0) {
    return "<p>No rows returned.</p>";
  }

  const firstRow = rowsArray[0];
  if (typeof firstRow !== "object" || firstRow === null) {
    return `<p>${String(firstRow)}</p>`;
  }

  const columns = Object.keys(firstRow);
  const header = columns.map((col) => `<th>${col}</th>`).join("");
  const rows = rowsArray
    .map((row) => {
      const cells = columns
        .map((col) => `<td>${row[col] ?? ""}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `
    <div class="table-wrapper">
      <table>
        <thead><tr>${header}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};

const setResponse = (container, { state, message, query, rows }) => {
  if (!container) return;
  const parts = [];

  if (state === "loading") {
    parts.push(`<div class="response__status response__status--loading">${message}</div>`);
  } else if (state === "error") {
    parts.push(`<div class="response__status response__status--error">${message}</div>`);
  } else if (state === "success") {
    parts.push(`<div class="response__status response__status--success">${message}</div>`);
  }

  if (query) {
    parts.push(`<pre class="response__query">${query}</pre>`);
  }

  if (rows) {
    parts.push(renderTable(rows));
  }

  container.innerHTML = parts.join("");
};

const executeSql = async (query) => {
  const normalizedQuery = normalizeQuery(query);
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: normalizedQuery }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.status !== "success") {
      const error = new Error(payload.message || "Failed to execute query.");
      error.query = normalizedQuery;
      error.details = payload;
      throw error;
    }

    return { payload, query: normalizedQuery };
  } catch (error) {
    if (!error.query) {
      error.query = normalizedQuery;
    }
    throw error;
  }
};

const sendQuery = async (query, container) => {
  const normalizedQuery = normalizeQuery(query);

  setResponse(container, {
    state: "loading",
    message: "Executing query...",
    query: normalizedQuery,
  });

  try {
    const { payload, query: executedQuery } = await executeSql(query);

    setResponse(container, {
      state: "success",
      message: `Success! Rows affected/returned: ${payload.results ?? "n/a"}`,
      query: executedQuery,
      rows: payload.data,
    });
  } catch (error) {
    setResponse(container, {
      state: "error",
      message: error.message || "Failed to execute query.",
      query: error.query || normalizedQuery,
    });
  }
};

// ----- Add Race & Results -----
const raceResultsWrapper = document.getElementById("race-results-rows");
const raceResultTemplate = document.getElementById("race-result-row-template");
const addResultRowBtn = document.getElementById("add-result-row-btn");

const createResultRow = () => {
  if (!raceResultTemplate) return null;
  const fragment = raceResultTemplate.content.cloneNode(true);
  return fragment;
};

const appendResultRow = () => {
  if (!raceResultsWrapper) return;
  const rowFragment = createResultRow();
  if (rowFragment) {
    raceResultsWrapper.appendChild(rowFragment);
  }
};

if (addResultRowBtn) {
  addResultRowBtn.addEventListener("click", () => {
    appendResultRow();
  });
}

if (raceResultsWrapper) {
  raceResultsWrapper.addEventListener("click", (event) => {
    const target = event.target;
    if (target && target.classList.contains("remove-row-btn")) {
      const row = target.closest(".form__row");
      if (row) {
        raceResultsWrapper.removeChild(row);
      }
    }
  });
}

appendResultRow();

const addRaceForm = document.getElementById("add-race-form");
const addRaceResponse = document.getElementById("add-race-response");
const allowedResults = new Set(["first", "second", "third", "other"]);

if (addRaceForm) {
  addRaceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData(addRaceForm);
      const raceId = sanitizeIdentifier(formData.get("raceId"), "race");
      const raceName = escapeSqlString(formData.get("raceName"));
      const trackName = escapeSqlString(formData.get("trackName"));
      const raceDate = formData.get("raceDate");
      const raceTime = formData.get("raceTime");

      if (!raceId) {
        setResponse(addRaceResponse, {
          state: "error",
          message: "Race ID must look like race1, race2, etc.",
        });
        return;
      }

      const raceIdSql = escapeSqlString(raceId);

      const resultRows = [...raceResultsWrapper.querySelectorAll(".form__row")];

      if (resultRows.length === 0) {
        setResponse(addRaceResponse, {
          state: "error",
          message: "Please add at least one race result row.",
        });
        return;
      }

      const resultValues = [];
      for (const row of resultRows) {
        const horseId = sanitizeIdentifier(
          row.querySelector('input[name="horseId"]')?.value,
          "horse"
        );
        const resultRaw = row.querySelector('[name="result"]')?.value;
        const result =
          typeof resultRaw === "string" ? resultRaw.trim().toLowerCase() : "";
        const prizeRaw = row.querySelector('input[name="prize"]')?.value;
        const prize = toNumber(prizeRaw ?? 0);

        if (!horseId || !allowedResults.has(result)) {
          setResponse(addRaceResponse, {
            state: "error",
            message:
              "Every race result row must include a horse ID like horse1 and a valid finish position.",
          });
          return;
        }

        const prizeValue = Number.isFinite(prize) ? prize : 0;

        const finishPosition = escapeSqlString(result);
        const horseIdSql = escapeSqlString(horseId);

        resultValues.push(
          `('${raceIdSql}', '${horseIdSql}', '${finishPosition}', ${prizeValue})`
        );
      }

      const { raceInsert: raceInsertTemplate, resultsInsert: resultsInsertTemplate } =
        await getAdminQuery("addRace");

      const raceInsert = formatQuery(raceInsertTemplate, {
        raceId: `'${raceIdSql}'`,
        raceName,
        trackName,
        raceDate,
        raceTime,
      });

      const resultsInsert = formatQuery(resultsInsertTemplate, {
        values: resultValues.join(", "),
      });

      const raceInsertDisplay = normalizeQuery(raceInsert);
      const resultsInsertDisplay = normalizeQuery(resultsInsert);

      setResponse(addRaceResponse, {
        state: "loading",
        message: "Creating race and inserting results...",
        query: `${raceInsertDisplay};\n${resultsInsertDisplay};`,
      });

      try {
        const raceOutcome = await executeSql(raceInsert);
        const resultsOutcome = await executeSql(resultsInsert);

        setResponse(addRaceResponse, {
          state: "success",
          message: `Race created and ${resultValues.length} race result ${
            resultValues.length === 1 ? "entry" : "entries"
          } stored.`,
          query: `${raceOutcome.query};\n${resultsOutcome.query};`,
          rows: resultsOutcome.payload?.data,
        });
      } catch (error) {
        setResponse(addRaceResponse, {
          state: "error",
          message: error.message || "Failed to execute race insert.",
          query: error.query || `${raceInsertDisplay};\n${resultsInsertDisplay};`,
        });
      }
    } catch (error) {
      setResponse(addRaceResponse, {
        state: "error",
        message: error.message || "Failed to prepare query.",
      });
    }
  });
}

// ----- Delete Owner -----
const deleteOwnerForm = document.getElementById("delete-owner-form");
const deleteOwnerResponse = document.getElementById("delete-owner-response");

if (deleteOwnerForm) {
  deleteOwnerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData(deleteOwnerForm);
      const ownerId = sanitizeIdentifier(formData.get("ownerId"), "owner");

      if (!ownerId) {
        setResponse(deleteOwnerResponse, {
          state: "error",
          message: "Owner ID must look like owner1, owner2, etc.",
        });
        return;
      }

      const deleteOwnerTemplate = await getAdminQuery("deleteOwner");
      const safeOwnerId = `'${escapeSqlString(ownerId)}'`;
      const query = formatQuery(deleteOwnerTemplate, {
        ownerId: safeOwnerId,
      });

      sendQuery(query, deleteOwnerResponse);
    } catch (error) {
      setResponse(deleteOwnerResponse, {
        state: "error",
        message: error.message || "Failed to prepare query.",
      });
    }
  });
}

// ----- Move Horse -----
const moveHorseForm = document.getElementById("move-horse-form");
const moveHorseResponse = document.getElementById("move-horse-response");

if (moveHorseForm) {
  moveHorseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData(moveHorseForm);
      const horseId = sanitizeIdentifier(formData.get("horseId"), "horse");
      const stableId = toNumber(formData.get("stableId"));

      if (!horseId || !Number.isFinite(stableId)) {
        setResponse(moveHorseResponse, {
          state: "error",
          message: "Horse ID must look like horse1 and Stable ID must be a number.",
        });
        return;
      }

      const moveHorseTemplate = await getAdminQuery("moveHorse");
      const query = formatQuery(moveHorseTemplate, {
        horseId: `'${escapeSqlString(horseId)}'`,
        stableId,
      });

      sendQuery(query, moveHorseResponse);
    } catch (error) {
      setResponse(moveHorseResponse, {
        state: "error",
        message: error.message || "Failed to prepare query.",
      });
    }
  });
}

// ----- Approve Trainer -----
const approveTrainerForm = document.getElementById("approve-trainer-form");
const approveTrainerResponse = document.getElementById("approve-trainer-response");

if (approveTrainerForm) {
  approveTrainerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData(approveTrainerForm);
      const trainerId = toNumber(formData.get("trainerId"));
      const firstName = escapeSqlString(formData.get("firstName"));
      const lastName = escapeSqlString(formData.get("lastName"));
      const stableId = toNumber(formData.get("stableId"));

      if (!Number.isFinite(trainerId) || !Number.isFinite(stableId)) {
        setResponse(approveTrainerResponse, {
          state: "error",
          message: "Trainer ID and Stable ID must both be numbers.",
        });
        return;
      }

      const approveTrainerTemplate = await getAdminQuery("approveTrainer");
      const query = formatQuery(approveTrainerTemplate, {
        trainerId,
        lastName,
        firstName,
        stableId,
      });

      sendQuery(query, approveTrainerResponse);
    } catch (error) {
      setResponse(approveTrainerResponse, {
        state: "error",
        message: error.message || "Failed to prepare query.",
      });
    }
  });
}
