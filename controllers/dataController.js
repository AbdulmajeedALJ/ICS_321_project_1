exports.executeQuery = async (req, res) => {
  try {
    const query = req.body?.query;

    if (!query) {
      return res.status(400).json({
        status: "fail",
        message: "Request body must include a `query` property.",
      });
    }

    console.log("Executing root query:", query);

    const [rows] = await req.app.locals.query(query);

    res.status(200).json({
      status: "success",
      results: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("Failed to execute custom query", err);
    res.status(500).json({
      status: "error",
      message: "Failed to execute custom query.",
    });
  }
};

const fetchAll = async (req, res, tableName) => {
  try {
    const [rows] = await req.app.locals.query(`SELECT * FROM ${tableName}`);

    res.status(200).json({
      status: "success",
      results: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error(`Failed to fetch ${tableName}`, err);
    res.status(500).json({
      status: "error",
      message: `Failed to fetch ${tableName}`,
    });
  }
};

exports.listHorses = (req, res) => fetchAll(req, res, "Horse");
exports.listOwners = (req, res) => fetchAll(req, res, "Owner");
exports.listOwnerships = (req, res) => fetchAll(req, res, "Owns");
exports.listStables = (req, res) => fetchAll(req, res, "Stable");
exports.listTrainers = (req, res) => fetchAll(req, res, "Trainer");
exports.listRaces = (req, res) => fetchAll(req, res, "Race");
exports.listRaceResults = (req, res) => fetchAll(req, res, "RaceResults");
exports.listTracks = (req, res) => fetchAll(req, res, "Track");
