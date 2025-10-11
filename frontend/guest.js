const API_URL = "http://localhost:1234/";

const escapeSqlString = (value) => {
  if (typeof value !== "string") return value;
  return value.replace(/'/g, "''").trim();
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
      const cells = columns.map((col) => `<td>${row[col] ?? ""}</td>`).join("");
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
    parts.push(
      `<div class="response__status response__status--loading">${message}</div>`
    );
  } else if (state === "error") {
    parts.push(
      `<div class="response__status response__status--error">${message}</div>`
    );
  } else if (state === "success") {
    parts.push(
      `<div class="response__status response__status--success">${message}</div>`
    );
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
    message: "Running query...",
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
      message: `Success! Rows returned: ${payload.results ?? "n/a"}`,
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

// ----- Owners' Horses & Trainers -----
const ownersHorsesForm = document.getElementById("owners-horses-form");
const ownersHorsesResponse = document.getElementById("owners-horses-response");

if (ownersHorsesForm) {
  ownersHorsesForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const queries = await loadQueries();
      const formData = new FormData(ownersHorsesForm);
      const ownerLastName = escapeSqlString(formData.get("ownerLastName"));

      if (!ownerLastName) {
        setResponse(ownersHorsesResponse, {
          state: "error",
          message: "Owner last name is required.",
        });
        return;
      }

      const query = formatQuery(queries.guest.ownersHorses, {
        ownerLastName,
      });

      sendQuery(query, ownersHorsesResponse);
    } catch (error) {
      setResponse(ownersHorsesResponse, {
        state: "error",
        message: error.message || "Failed to prepare query.",
      });
    }
  });
}

// ----- Winning Trainers -----
const winningTrainersBtn = document.getElementById("winning-trainers-btn");
const winningTrainersResponse = document.getElementById(
  "winning-trainers-response"
);

if (winningTrainersBtn) {
  winningTrainersBtn.addEventListener("click", async () => {
    try {
      const queries = await loadQueries();
      const query = queries.guest.winningTrainers;
      sendQuery(query, winningTrainersResponse);
    } catch (error) {
      setResponse(winningTrainersResponse, {
        state: "error",
        message: error.message || "Failed to load query.",
      });
    }
  });
}

// ----- Trainer Prize Totals -----
const trainerWinningsBtn = document.getElementById("trainer-winnings-btn");
const trainerWinningsResponse = document.getElementById(
  "trainer-winnings-response"
);

if (trainerWinningsBtn) {
  trainerWinningsBtn.addEventListener("click", async () => {
    try {
      const queries = await loadQueries();
      sendQuery(queries.guest.trainerWinnings, trainerWinningsResponse);
    } catch (error) {
      setResponse(trainerWinningsResponse, {
        state: "error",
        message: error.message || "Failed to load query.",
      });
    }
  });
}

// ----- Track Activity -----
const trackActivityBtn = document.getElementById("track-activity-btn");
const trackActivityResponse = document.getElementById(
  "track-activity-response"
);

if (trackActivityBtn) {
  trackActivityBtn.addEventListener("click", async () => {
    try {
      const queries = await loadQueries();
      sendQuery(queries.guest.trackActivity, trackActivityResponse);
    } catch (error) {
      setResponse(trackActivityResponse, {
        state: "error",
        message: error.message || "Failed to load query.",
      });
    }
  });
}
