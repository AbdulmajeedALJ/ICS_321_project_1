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

const sendQuery = async (query, container) => {
  const normalizedQuery = normalizeQuery(query);

  setResponse(container, {
    state: "loading",
    message: "Executing query...",
    query: normalizedQuery,
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: normalizedQuery }),
    });

    const payload = await response.json();

    if (!response.ok || payload.status !== "success") {
      throw new Error(payload.message || "Unknown error.");
    }

    setResponse(container, {
      state: "success",
      message: `Success! Rows affected/returned: ${payload.results ?? "n/a"}`,
      query: normalizedQuery,
      rows: payload.data,
    });
  } catch (error) {
    setResponse(container, {
      state: "error",
      message: error.message || "Failed to execute query.",
      query: normalizedQuery,
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

if (addRaceForm) {
  addRaceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const queries = await loadQueries();
      const formData = new FormData(addRaceForm);
      const raceId = toNumber(formData.get("raceId"));
      const raceName = escapeSqlString(formData.get("raceName"));
      const trackName = escapeSqlString(formData.get("trackName"));
      const raceDate = formData.get("raceDate");
      const raceTime = formData.get("raceTime");

      if (!Number.isFinite(raceId)) {
        setResponse(addRaceResponse, {
          state: "error",
          message: "Race ID must be a valid number.",
        });
        return;
      }

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
        const horseId = toNumber(row.querySelector('input[name="horseId"]')?.value);
        const result = toNumber(row.querySelector('input[name="result"]')?.value);
        const prizeRaw = row.querySelector('input[name="prize"]')?.value;
        const prize = toNumber(prizeRaw ?? 0);

        if (!Number.isFinite(horseId) || !Number.isFinite(result)) {
          setResponse(addRaceResponse, {
            state: "error",
            message: "Every race result row must include numeric horse ID and finish position.",
          });
          return;
        }

        const prizeValue = Number.isFinite(prize) ? prize : 0;

        resultValues.push(`(${raceId}, ${horseId}, ${result}, ${prizeValue})`);
      }

      const { raceInsert: raceInsertTemplate, resultsInsert: resultsInsertTemplate } =
        queries.admin.addRace;

      const raceInsert = formatQuery(raceInsertTemplate, {
        raceId,
        raceName,
        trackName,
        raceDate,
        raceTime,
      });

      const resultsInsert = formatQuery(resultsInsertTemplate, {
        values: resultValues.join(", "),
      });

      const query = `${raceInsert} ${resultsInsert}`;
      sendQuery(query, addRaceResponse);
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
      const queries = await loadQueries();
      const formData = new FormData(deleteOwnerForm);
      const ownerId = toNumber(formData.get("ownerId"));
      const procedureName = (formData.get("procedureName") || "DeleteOwnerCascade").replace(
        /[^A-Za-z0-9_]/g,
        ""
      );

      if (!Number.isFinite(ownerId)) {
        setResponse(deleteOwnerResponse, {
          state: "error",
          message: "Owner ID must be a valid number.",
        });
        return;
      }

      const query = formatQuery(queries.admin.deleteOwner, {
        procedureName,
        ownerId,
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
      const queries = await loadQueries();
      const formData = new FormData(moveHorseForm);
      const horseId = toNumber(formData.get("horseId"));
      const stableId = toNumber(formData.get("stableId"));

      if (!Number.isFinite(horseId) || !Number.isFinite(stableId)) {
        setResponse(moveHorseResponse, {
          state: "error",
          message: "Horse ID and Stable ID must both be numbers.",
        });
        return;
      }

      const query = formatQuery(queries.admin.moveHorse, {
        horseId,
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
      const queries = await loadQueries();
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

      const query = formatQuery(queries.admin.approveTrainer, {
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
